export interface UpiDay {
  date: string;
  amount: number;
}

export interface ForecastDay {
  date: string;
  bankMoney: number;
  gallaCash: number;
  total?: number;
  [key: string]: any;
}
