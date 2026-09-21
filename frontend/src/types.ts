export interface UpiDay {
  date: string;
  amount: number;
}

export interface ForecastDay {
  date: string;
  bankBalance: number;
  gallaCash: number;
  total?: number;
  [key: string]: any;
}
