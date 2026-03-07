package middleware

import (
	"bytes"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// bufferedWriter captures the response status and body so the sanitizer
// can inspect them after the handler chain completes.  For SSE responses
// (Content-Type: text/event-stream) it switches to pass-through mode
// because those are long-lived streams that cannot be buffered.
type bufferedWriter struct {
	gin.ResponseWriter
	buf         bytes.Buffer
	status      int
	passthrough bool
}

func (w *bufferedWriter) WriteHeader(code int) {
	w.status = code
	if w.passthrough {
		w.ResponseWriter.WriteHeader(code)
	}
}

func (w *bufferedWriter) Write(data []byte) (int, error) {
	if w.passthrough {
		return w.ResponseWriter.Write(data)
	}
	return w.buf.Write(data)
}

func (w *bufferedWriter) WriteString(s string) (int, error) {
	if w.passthrough {
		return w.ResponseWriter.WriteString(s)
	}
	return w.buf.WriteString(s)
}

func (w *bufferedWriter) Flush() {
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// ErrorSanitizer ensures no 500-level response leaks internal details.
// It buffers response bodies and, for status >= 500, replaces the body
// with a generic error message while logging the original to stderr.
func ErrorSanitizer() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip buffering for CORS preflight — the CORS middleware handles these directly.
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		bw := &bufferedWriter{ResponseWriter: c.Writer, status: http.StatusOK}
		c.Writer = bw

		c.Next()

		// If the handler set SSE content type, it already wrote directly.
		if bw.passthrough {
			return
		}

		if bw.status >= 500 {
			log.Printf("[ERROR-SANITIZER] %s %s -> %d: %s",
				c.Request.Method, c.Request.URL.Path, bw.status, bw.buf.String())

			bw.ResponseWriter.Header().Set("Content-Type", "application/json; charset=utf-8")
			bw.ResponseWriter.WriteHeader(bw.status)
			bw.ResponseWriter.Write([]byte(`{"error":"internal server error"}`))
			return
		}

		// Non-error: flush buffered response as-is.
		bw.ResponseWriter.WriteHeader(bw.status)
		bw.ResponseWriter.Write(bw.buf.Bytes())
	}
}

// EnablePassthrough switches the buffered writer to pass-through mode.
// Call this from handlers that stream responses (e.g. SSE) before writing
// any data so the sanitizer does not buffer the stream.
func EnablePassthrough(c *gin.Context) {
	if bw, ok := c.Writer.(*bufferedWriter); ok {
		bw.passthrough = true
	}
}
