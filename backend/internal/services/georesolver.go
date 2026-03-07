package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/localnews/backend/internal/middleware"
)

// GeoIPResolver does real GeoIP lookups via ip-api.com with in-memory caching.
type GeoIPResolver struct {
	mu    sync.RWMutex
	cache map[string]cachedGeo
	client *http.Client
}

type cachedGeo struct {
	result    middleware.StatsGeoResult
	expiresAt time.Time
}

type ipAPIResponse struct {
	Status  string  `json:"status"`
	City    string  `json:"city"`
	Lat     float64 `json:"lat"`
	Lon     float64 `json:"lon"`
	Country string  `json:"country"`
}

func NewGeoIPResolver() *GeoIPResolver {
	return &GeoIPResolver{
		cache:  make(map[string]cachedGeo),
		client: &http.Client{Timeout: 2 * time.Second},
	}
}

func (g *GeoIPResolver) Resolve(ip string) middleware.StatsGeoResult {
	if isPrivateIP(ip) {
		return middleware.StatsGeoResult{Lat: 60.1867, Lng: 24.8283, CityName: "Local"}
	}

	// Check cache
	g.mu.RLock()
	if cached, ok := g.cache[ip]; ok && time.Now().Before(cached.expiresAt) {
		g.mu.RUnlock()
		return cached.result
	}
	g.mu.RUnlock()

	// Lookup
	result := g.lookup(ip)

	// Cache for 1 hour
	g.mu.Lock()
	g.cache[ip] = cachedGeo{result: result, expiresAt: time.Now().Add(time.Hour)}
	// Evict old entries if cache gets large
	if len(g.cache) > 10000 {
		now := time.Now()
		for k, v := range g.cache {
			if now.After(v.expiresAt) {
				delete(g.cache, k)
			}
		}
	}
	g.mu.Unlock()

	return result
}

func (g *GeoIPResolver) lookup(ip string) middleware.StatsGeoResult {
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,city,lat,lon,country", ip)
	resp, err := g.client.Get(url)
	if err != nil {
		log.Printf("geoip lookup failed for %s: %v", ip, err)
		return middleware.StatsGeoResult{Lat: 60.1867, Lng: 24.8283, CityName: "Unknown"}
	}
	defer resp.Body.Close()

	var data ipAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil || data.Status != "success" {
		return middleware.StatsGeoResult{Lat: 60.1867, Lng: 24.8283, CityName: "Unknown"}
	}

	return middleware.StatsGeoResult{
		Lat:      data.Lat,
		Lng:      data.Lon,
		CityName: data.City,
	}
}

func isPrivateIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return true
	}
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast()
}
