import mongoose, { Schema, Document, models } from "mongoose";

export interface IFileData {
  url: string;
  resource_type: string;
}

export interface IOrder extends Document {
  order_id: string;
  user_id: mongoose.Types.ObjectId;
  user_name: string;
  user_email: string;
  service: string;
  quantity: number;
  specifications: string;
  delivery_option: "pickup" | "delivery";
  delivery_address: string | null;
  pickup_time: string | null;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  payment_method: string;
  total_amount: number;
  files: IFileData[];
  created_at: Date;
  updated_at: Date;
}

const FileDataSchema = new Schema<IFileData>(
  {
    url: { type: String, required: true },
    resource_type: { type: String, default: "image" },
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>({
  order_id: { type: String, unique: true, sparse: true },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
  user_name: { type: String, default: "" },
  user_email: { type: String, default: "" },
  service: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  specifications: { type: String, required: true },
  delivery_option: {
    type: String,
    enum: ["pickup", "delivery"],
    default: "pickup",
  },
  delivery_address: { type: String, default: null },
  pickup_time: { type: String, default: null },
  status: {
    type: String,
    enum: ["pending", "in-progress", "completed", "cancelled"],
    default: "pending",
  },
  payment_method: { type: String, default: "cash" },
  total_amount: { type: Number, required: true, default: 0 },
  files: { type: [FileDataSchema], default: [] },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// ✅ Auto-generate order_id and update updated_at on every save
OrderSchema.pre("save", async function () {
  this.updated_at = new Date();
  if (!this.order_id) {
    this.order_id = new mongoose.Types.ObjectId().toString().slice(-8);
  }
});

export const Order =
  models.Order || mongoose.model<IOrder>("Order", OrderSchema);
