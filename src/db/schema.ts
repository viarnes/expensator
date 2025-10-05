export enum Direction {
  IN = 'IN',
  OUT = 'OUT'
}

export enum PaymentMethod {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER'
}

export enum Category {
  HOUSING = 'HOUSING',
  FOOD_GROCERIES = 'FOOD_GROCERIES',
  TRANSPORTATION = 'TRANSPORTATION',
  PETS = 'PETS',
  LEISURE_ENTERTAINMENT = 'LEISURE_ENTERTAINMENT',
  OTHER = 'OTHER'
}

export interface RecordEntity {
  id: string;
  name: string;
  direction: Direction;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  category: Category;
  createdAt: Date;
}

export interface MessageEntity {
  id: string;
  senderId: string;
  messageType: string;
  text?: string | null;
  mediaUrl?: string | null;
  replyToMessageId?: string | null;
  dateCreatedAt: Date;
}
