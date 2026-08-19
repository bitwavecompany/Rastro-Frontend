import api from './axios'

export interface Gasto {
  id?: number
  description: string
  amount: number
}

export const crearGasto = (gasto: Gasto) =>
  api.post<Gasto>('/gastos', gasto)

export const obtenerGastos = () =>
  api.get<Gasto[]>('/gastos')