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
	return `The city council met last night to discuss the proposed budget for the upcoming fiscal year.
Council member Maria Johnson said "We need to prioritize infrastructure spending, especially road repairs
on Main Street that have been delayed for over two years." The proposed budget of 4.2 million dollars
includes allocations for parks maintenance, library expansion, and a new community center in the downtown area.
Mayor Thompson noted that property tax revenue is up 8 percent from last year, giving the city more room
to invest in public services. Several residents spoke during the public comment period, with most expressing
support for the library expansion project. The council will vote on the final budget at next month's meeting.`, nil
}
