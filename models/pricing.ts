import mongoose, { Schema, Document, models } from "mongoose";

export interface IPricing extends Document {
  print_bw: number;
  print_color: number;
  photocopying: number;
  scanning: number;
  photo_development: number;
  laminating: number;
  updated_at: Date;
}

const PricingSchema = new Schema<IPricing>({
  print_bw:          { type: Number, required: true, default: 1.0 },
  print_color:       { type: Number, required: true, default: 2.0 },
  photocopying:      { type: Number, required: true, default: 2.0 },
  scanning:          { type: Number, required: true, default: 5.0 },
  photo_development: { type: Number, required: true, default: 15.0 },
  laminating:        { type: Number, required: true, default: 20.0 },
  updated_at:        { type: Date, default: Date.now },
});

export const Pricing = models.Pricing || mongoose.model<IPricing>("Pricing", PricingSchema);