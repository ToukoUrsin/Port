package services

import (
	"hash/fnv"
	"math/rand"
	"net"

	"github.com/localnews/backend/internal/middleware"
)

type demoCity struct {
	Name string
	Lat  float64
	Lng  float64
}

var demoCities = []demoCity{
	{"Helsinki", 60.1699, 24.9384},
	{"Stockholm", 59.3293, 18.0686},
	{"London", 51.5074, -0.1278},
	{"New York", 40.7128, -74.0060},
	{"Tokyo", 35.6762, 139.6503},
	{"Berlin", 52.5200, 13.4050},
	{"Paris", 48.8566, 2.3522},
	{"Sydney", -33.8688, 151.2093},
	{"Mumbai", 19.0760, 72.8777},
	{"Singapore", 1.3521, 103.8198},
	{"Cape Town", -33.9249, 18.4241},
	{"Toronto", 43.6532, -79.3832},
	{"Seoul", 37.5665, 126.9780},
	{"Dubai", 25.2048, 55.2708},
	{"Bangkok", 13.7563, 100.5018},
	{"Sao Paulo", -23.5505, -46.6333},
	{"Lagos", 6.5244, 3.3792},
	{"Moscow", 55.7558, 37.6173},
	{"Buenos Aires", -34.6037, -58.3816},
	{"Mexico City", 19.4326, -99.1332},
}

type DemoGeoResolver struct{}

func NewDemoGeoResolver() *DemoGeoResolver {
	return &DemoGeoResolver{}
}

func (d *DemoGeoResolver) Resolve(ip string) middleware.StatsGeoResult {
	if isPrivateIP(ip) {
		city := demoCities[rand.Intn(len(demoCities))]
		return middleware.StatsGeoResult{Lat: city.Lat, Lng: city.Lng, CityName: city.Name}
	}
	h := fnv.New32a()
	h.Write([]byte(ip))
	idx := int(h.Sum32()) % len(demoCities)
	city := demoCities[idx]
	return middleware.StatsGeoResult{Lat: city.Lat, Lng: city.Lng, CityName: city.Name}
}

func isPrivateIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return true
	}
	privateRanges := []struct{ start, end net.IP }{
		{net.ParseIP("10.0.0.0"), net.ParseIP("10.255.255.255")},
		{net.ParseIP("172.16.0.0"), net.ParseIP("172.31.255.255")},
		{net.ParseIP("192.168.0.0"), net.ParseIP("192.168.255.255")},
		{net.ParseIP("127.0.0.0"), net.ParseIP("127.255.255.255")},
	}
	ip4 := ip.To4()
	if ip4 == nil {
		return true
	}
	for _, r := range privateRanges {
		if bytesInRange(ip4, r.start.To4(), r.end.To4()) {
			return true
		}
	}
	return false
}

func bytesInRange(ip, start, end net.IP) bool {
	for i := 0; i < 4; i++ {
		if ip[i] < start[i] {
			return false
		}
		if ip[i] > end[i] {
			return false
		}
	}
	return true
}
