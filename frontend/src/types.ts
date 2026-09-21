export interface UpiDay {
  date: string;
  amount: number;
}

export interface ShopInputs {
  bankBalance: number;
  drawerCash: number;
  moneyGoingOut: number;
  promisedPayments: number;
}

export interface ForecastDay {
  date: string;
  bankMoney: number;
  gallaCash: number;
  total?: number;
  [key: string]: any;
}
