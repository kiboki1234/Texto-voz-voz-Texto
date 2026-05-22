import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export function useStations() {
  return useQuery({ queryKey: ['stations'], queryFn: api.stations });
}

export function useVariables() {
  return useQuery({ queryKey: ['variables'], queryFn: api.variables });
}

export function useLatest(stationId: number) {
  return useQuery({ queryKey: ['latest', stationId], queryFn: () => api.latest(stationId) });
}

export function useSummary(stationId: number) {
  return useQuery({ queryKey: ['summary', stationId], queryFn: () => api.summary(stationId) });
}

export function useSummaries() {
  return useQuery({ queryKey: ['summaries'], queryFn: api.summaries });
}

export function useSeries(stationId: number, variable: string, from: string, to: string, resolution: string) {
  return useQuery({
    queryKey: ['series', stationId, variable, from, to, resolution],
    queryFn: () => api.series(stationId, variable, from, to, resolution),
  });
}

export function useAlerts() {
  return useQuery({ queryKey: ['alerts'], queryFn: api.alerts });
}

export function useSprayWindow(stationId: number) {
  return useQuery({ queryKey: ['spray', stationId], queryFn: () => api.sprayWindow(stationId) });
}

export function useNpk(stationId: number) {
  return useQuery({ queryKey: ['npk', stationId], queryFn: () => api.npk(stationId) });
}

export function useOmbrothermal(stationId: number, year: number) {
  return useQuery({ queryKey: ['ombro', stationId, year], queryFn: () => api.ombrothermal(stationId, year) });
}

export function useEto(stationId: number, from: string, to: string) {
  return useQuery({ queryKey: ['eto', stationId, from, to], queryFn: () => api.eto(stationId, from, to) });
}

export function useWindRose(stationId: number, from: string, to: string) {
  return useQuery({ queryKey: ['windRose', stationId, from, to], queryFn: () => api.windRose(stationId, from, to) });
}
