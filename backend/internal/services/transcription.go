package services

import (
	"context"
	"time"
)

type TranscriptionService interface {
	Transcribe(ctx context.Context, audioPath string) (string, error)
}

type StubTranscriptionService struct{}

func NewStubTranscriptionService() *StubTranscriptionService {
	return &StubTranscriptionService{}
}

func (s *StubTranscriptionService) Transcribe(ctx context.Context, audioPath string) (string, error) {
	time.Sleep(2 * time.Second)
	return `Speaker 1: The city council met last night to discuss the proposed budget for the upcoming fiscal year. The proposed budget of 4.2 million dollars includes allocations for parks maintenance, library expansion, and a new community center in the downtown area.
Speaker 2: We need to prioritize infrastructure spending, especially road repairs on Main Street that have been delayed for over two years. The residents deserve better.
Speaker 1: Mayor Thompson noted that property tax revenue is up 8 percent from last year, giving the city more room to invest in public services.
Speaker 3: I just want to say that the library expansion is really important for our community. My kids go there every week and it's always packed.
Speaker 1: Several residents spoke during the public comment period, with most expressing support for the library expansion project. The council will vote on the final budget at next month's meeting.`, nil
}
