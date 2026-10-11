declare module "@paystack/inline-js" {
  type CheckoutOptions = {
    key: string;
    email: string;
    amount: number;
    currency: string;
    firstname?: string;
    lastname?: string;
    onSuccess?: (transaction: { reference: string }) => void;
    onCancel?: () => void;
  };

  export default class Paystack {
    checkout(options: CheckoutOptions): Promise<void>;
  }
}
