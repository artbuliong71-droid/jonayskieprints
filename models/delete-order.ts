import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IDeletedOrder extends Document {
  original_id: string;
  order_id: string;
  user_name: string;
  user_email: string;
  service: string;
  quantity: number;
  status: string;
  total_amount: number;
  delivery_option: string;
  specifications: string;
  created_at: Date;
  deleted_at: Date;
}

const DeletedOrderSchema = new Schema<IDeletedOrder>({
  original_id:    { type: String, required: true },
  order_id:       { type: String, default: "" },
  user_name:      { type: String, default: "" },
  user_email:     { type: String, default: "" },
  service:        { type: String, default: "" },
  quantity:       { type: Number, default: 1 },
  status:         { type: String, default: "cancelled" },
  total_amount:   { type: Number, default: 0 },
  delivery_option:{ type: String, default: "" },
  specifications: { type: String, default: "" },
  created_at:     { type: Date },
  deleted_at:     { type: Date, default: Date.now },
});

export const DeletedOrder = models.DeletedOrder || model<IDeletedOrder>("DeletedOrder", DeletedOrderSchema);