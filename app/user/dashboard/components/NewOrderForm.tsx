"use client";

import { Fragment, useRef } from "react";
import {
  Prices,
  PaperSize,
  ColorOption,
  DeliveryOption,
  SERVICES,
  PAPER_MULTIPLIERS,
  sp,
  formatPickupTime,
  calcTotal,
} from "./types";
import {
  IC,
  IcoGCash,
  IcoCash,
  IcoWarning,
  IcoFullPayment,
  IcoDownpayment,
} from "./icons";
import { PickupTimeDropdown } from "./ui";

interface NewOrderFormProps {
  step: number;
  setStep: (n: number) => void;
  noService: string;
  setNoService: (v: string) => void;
  noQuantity: number | "";
  setNoQuantity: (v: number | "") => void;
  noCopies: number | "";
  setNoCopies: (v: number | "") => void;
  noPdfPages: number;
  setNoPdfPages: (v: number) => void;
  noDelivery: DeliveryOption;
  setNoDelivery: (v: DeliveryOption) => void;
  noAddress: string;
  setNoAddress: (v: string) => void;
  noPickupTime: string;
  setNoPickupTime: (v: string) => void;
  noPaperSize: PaperSize;
  setNoPaperSize: (v: PaperSize) => void;
  noPhotoSize: string;
  setNoPhotoSize: (v: string) => void;
  noColorOption: ColorOption;
  setNoColorOption: (v: ColorOption) => void;
  noLamination: boolean;
  setNoLamination: (v: boolean) => void;
  noFolder: boolean;
  setNoFolder: (v: boolean) => void;
  noFolderSize: string;
  setNoFolderSize: (v: string) => void;
  noFolderQty: number;
  setNoFolderQty: (v: number) => void;
  noFolderColor: string;
  setNoFolderColor: (v: string) => void;
  noSpecs: string;
  setNoSpecs: (v: string) => void;
  noFiles: FileList | null;
  setNoFiles: (v: FileList | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  noPaymentMethod: "cash" | "gcash";
  setNoPaymentMethod: (v: "cash" | "gcash") => void;
  noGcashPayType: "downpayment" | "full";
  setNoGcashPayType: (v: "downpayment" | "full") => void;
  noGcashRefNum: string;
  setNoGcashRefNum: (v: string) => void;
  noGcashReceipt: File | null;
  setNoGcashReceipt: (v: File | null) => void;
  noGcashReceiptPreview: string | null;
  setNoGcashReceiptPreview: (v: string | null) => void;
  gcashReceiptRef: React.RefObject<HTMLInputElement | null>;
  noSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  prices: Prices;
  showToast: (msg: string, type?: "success" | "error") => void;
  handleFileChange: (files: FileList | null) => void;
  handleCopiesChange: (val: number | "") => void;
  validateStep: (n: number) => boolean;
}

const FOLDER_COLORS = [
  "White",
  "Ivory",
  "Pink",
  "Red",
  "Blue",
  "Green",
  "Orange",
  "Yellow",
  "Purple",
  "Black",
  "Brown",
  "Clear",
];

const FOLDER_COLOR_SWATCHES: Record<string, string> = {
  White: "#ffffff",
  Ivory: "#fffff0",
  Pink: "#ffc0cb",
  Red: "#ef4444",
  Blue: "#3b82f6",
  Green: "#22c55e",
  Orange: "#f97316",
  Yellow: "#eab308",
  Purple: "#a855f7",
  Black: "#111827",
  Brown: "#92400e",
  Clear: "linear-gradient(135deg,#e0e7ff 0%,#f0fdf4 100%)",
};

export function NewOrderForm({
  step,
  setStep,
  noService,
  setNoService,
  noQuantity,
  setNoQuantity,
  noCopies,
  setNoCopies,
  noPdfPages,
  setNoPdfPages,
  noDelivery,
  setNoDelivery,
  noAddress,
  setNoAddress,
  noPickupTime,
  setNoPickupTime,
  noPaperSize,
  setNoPaperSize,
  noPhotoSize,
  setNoPhotoSize,
  noColorOption,
  setNoColorOption,
  noLamination,
  setNoLamination,
  noFolder,
  setNoFolder,
  noFolderSize,
  setNoFolderSize,
  noFolderQty,
  setNoFolderQty,
  noFolderColor,
  setNoFolderColor,
  noSpecs,
  setNoSpecs,
  noFiles,
  setNoFiles,
  fileInputRef,
  noPaymentMethod,
  setNoPaymentMethod,
  noGcashPayType,
  setNoGcashPayType,
  noGcashRefNum,
  setNoGcashRefNum,
  noGcashReceipt,
  setNoGcashReceipt,
  noGcashReceiptPreview,
  setNoGcashReceiptPreview,
  gcashReceiptRef,
  noSubmitting,
  onSubmit,
  prices,
  showToast,
  handleFileChange,
  handleCopiesChange,
  validateStep,
}: NewOrderFormProps) {
  const showsPaper = ["Print", "Photocopy", "Scanning"].includes(noService);
  const showsPhoto = noService === "Photo Development";
  const showsColor = noService === "Print" || noService === "Scanning";
  const showsLam = [
    "Print",
    "Photocopy",
    "Scanning",
    "Photo Development",
  ].includes(noService);
  const showsCopies = noService === "Print" || noService === "Photocopy";

  const effectiveQuantity = (() => {
    if (noQuantity !== "" && Number(noQuantity) >= 1) return Number(noQuantity);
    if (showsCopies) return Number(noCopies) || 1;
    return 0;
  })();

  const summaryTotal =
    noService && effectiveQuantity >= 1
      ? calcTotal(
          noService,
          effectiveQuantity,
          noColorOption,
          noPaperSize,
          noPhotoSize,
          noLamination,
          prices,
          noFolder,
          noFolderQty,
        )
      : 0;

  return (
    <div
      className="card"
      style={{ padding: "1rem", paddingBottom: "2rem", overflow: "visible" }}
    >
      <div
        style={{
          fontSize: ".93rem",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: "1.2rem",
        }}
      >
        Create New Order
      </div>

      {/* Step indicators */}
      <div className="steps">
        {["Service", "Details", "Review"].map((lbl, i) => (
          <Fragment key={`step-${i}`}>
            <div className="step-node">
              <div
                className={`step-dot ${i < step ? "done" : i === step ? "active" : ""}`}
              >
                {i < step ? <IC.Check /> : i + 1}
              </div>
              <div className="step-lbl">{lbl}</div>
            </div>
            {i < 2 && <div className={`step-line ${i < step ? "done" : ""}`} />}
          </Fragment>
        ))}
      </div>

      <form onSubmit={onSubmit}>
        {/* ── Step 0: Service + Delivery ── */}
        <div className={`step-box ${step === 0 ? "active" : ""}`}>
          <div className="form-group">
            <label className="form-label">Select Service</label>
            <select
              className="form-select"
              value={noService}
              onChange={(e) => {
                setNoService(e.target.value);
                setNoColorOption(
                  e.target.value === "Photocopy" ? "color" : "bw",
                );
                setNoLamination(false);
                setNoFolder(false);
                setNoFolderSize("A4");
                setNoFolderQty(1);
                setNoFolderColor("White");
                setNoPdfPages(0);
                setNoQuantity("");
                setNoCopies(1);
              }}
            >
              <option value="">-- Select Service --</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row-2">
            {showsCopies ? (
              <div className="form-group">
                <label className="form-label">Number of Copies</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="e.g. 3"
                  value={noCopies}
                  onChange={(e) => {
                    const val =
                      e.target.value === ""
                        ? ""
                        : Math.max(1, parseInt(e.target.value) || 1);
                    handleCopiesChange(val);
                  }}
                />
                <div className="hint-text">
                  Upload PDF/DOCX in Step 3 — pages will be auto-counted
                </div>
                {noPdfPages > 0 && Number(noCopies) > 0 && (
                  <div className="copies-info">
                    ✓ {noPdfPages} pages × {noCopies} copies ={" "}
                    {noPdfPages * Number(noCopies)} total pages
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Enter quantity"
                  value={noQuantity}
                  onChange={(e) => {
                    setNoQuantity(
                      e.target.value === ""
                        ? ""
                        : Math.max(1, parseInt(e.target.value) || 1),
                    );
                    setNoPdfPages(0);
                  }}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Delivery</label>
              <div className="radio-group" style={{ marginTop: ".5rem" }}>
                {(["pickup", "delivery"] as DeliveryOption[]).map((d) => (
                  <label
                    key={d}
                    className="radio-label"
                    style={{ alignItems: "flex-start" }}
                  >
                    <input
                      type="radio"
                      name="no_del"
                      value={d}
                      checked={noDelivery === d}
                      onChange={() => {
                        setNoDelivery(d);
                        setNoPickupTime("");
                      }}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: ".3rem",
                          fontWeight: 600,
                          fontSize: ".83rem",
                          color: "#111827",
                        }}
                      >
                        {d === "pickup" ? (
                          <>
                            <IC.Home /> Pickup
                          </>
                        ) : (
                          <>
                            <IC.Truck /> Delivery
                          </>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: ".68rem",
                          color: "#6b7280",
                          marginTop: 2,
                        }}
                      >
                        {d === "pickup"
                          ? "Pick up at our store"
                          : "Santa Rosa area only"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {noDelivery === "delivery" && (
            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <textarea
                className="form-textarea"
                placeholder="Enter complete address"
                value={noAddress}
                onChange={(e) => setNoAddress(e.target.value)}
              />
            </div>
          )}

          {noDelivery === "pickup" && (
            <div className="form-group">
              <label
                className="form-label"
                style={{ display: "flex", alignItems: "center", gap: ".35rem" }}
              >
                <IC.ClockSmall /> Preferred Pickup Time
              </label>
              <PickupTimeDropdown
                value={noPickupTime}
                onChange={setNoPickupTime}
              />
              <div className="hint-text">Business hours: 8:00 AM – 6:00 PM</div>
              {noPickupTime && (
                <div className="pickup-time-box">
                  <IC.ClockSmall /> Pickup at {formatPickupTime(noPickupTime)}
                </div>
              )}
            </div>
          )}

          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (validateStep(1)) setStep(1);
              }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* ── Step 1: Print Options + Specs ── */}
        <div className={`step-box ${step === 1 ? "active" : ""}`}>
          {showsPaper && (
            <div className="form-group">
              <label className="form-label">Paper Size</label>
              <select
                className="form-select"
                value={noPaperSize}
                onChange={(e) => setNoPaperSize(e.target.value as PaperSize)}
              >
                {(["A4", "Short", "Long"] as PaperSize[]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showsPhoto && (
            <div className="form-group">
              <label className="form-label">Photo Size</label>
              <select
                className="form-select"
                value={noPhotoSize}
                onChange={(e) => setNoPhotoSize(e.target.value)}
              >
                <option value="A4">Glossy A4</option>
                <option value="4x6">Glossy 4x6</option>
              </select>
            </div>
          )}
          {showsColor && (
            <div className="form-group">
              <label className="form-label">Print Type</label>
              <div className="radio-group" style={{ marginTop: ".4rem" }}>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="no_col"
                    value="bw"
                    checked={noColorOption === "bw"}
                    onChange={() => setNoColorOption("bw")}
                  />{" "}
                  B&W
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="no_col"
                    value="color"
                    checked={noColorOption === "color"}
                    onChange={() => setNoColorOption("color")}
                  />{" "}
                  Color
                </label>
              </div>
            </div>
          )}

          {showsLam && (
            <div className="form-group">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={noLamination}
                  onChange={(e) => setNoLamination(e.target.checked)}
                />
                Add Lamination (+₱{sp(prices.laminating, 20).toFixed(2)}/item)
              </label>
            </div>
          )}

          {/* ── Folder add-on ── */}
          {showsLam && (
            <div className="form-group">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={noFolder}
                  onChange={(e) => {
                    setNoFolder(e.target.checked);
                    if (!e.target.checked) {
                      setNoFolderSize("A4");
                      setNoFolderQty(1);
                      setNoFolderColor("White");
                    }
                  }}
                />
                Add Folder (+₱{sp(prices.folder, 10).toFixed(2)}/pc)
              </label>
              {noFolder && (
                <div
                  style={{
                    marginTop: ".75rem",
                    background: "#f5f3ff",
                    border: "1.5px solid #ddd6fe",
                    borderRadius: 10,
                    padding: ".75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: ".65rem",
                  }}
                >
                  {/* Size + Qty */}
                  <div style={{ display: "flex", gap: ".6rem" }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Size</label>
                      <select
                        className="form-select"
                        value={noFolderSize}
                        onChange={(e) => setNoFolderSize(e.target.value)}
                      >
                        <option value="A4">A4</option>
                        <option value="Short">Short</option>
                        <option value="Long">Long</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Quantity</label>
                      <input
                        className="form-input"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        placeholder="e.g. 2"
                        value={noFolderQty}
                        onChange={(e) =>
                          setNoFolderQty(
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                      />
                    </div>
                  </div>

                  {/* Color picker */}
                  <div>
                    <label
                      className="form-label"
                      style={{ marginBottom: ".4rem" }}
                    >
                      Color
                    </label>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: ".35rem",
                      }}
                    >
                      {FOLDER_COLORS.map((color) => {
                        const isSelected = noFolderColor === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            title={color}
                            onClick={() => setNoFolderColor(color)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: ".3rem",
                              padding: "3px 8px 3px 4px",
                              borderRadius: 99,
                              border: `2px solid ${isSelected ? "#7c3aed" : "#e5e7eb"}`,
                              background: isSelected ? "#f5f3ff" : "#fff",
                              cursor: "pointer",
                              fontFamily: "'Inter',sans-serif",
                              fontSize: ".72rem",
                              fontWeight: isSelected ? 700 : 500,
                              color: isSelected ? "#7c3aed" : "#374151",
                              transition: "all .12s",
                            }}
                          >
                            <span
                              style={{
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background: FOLDER_COLOR_SWATCHES[color],
                                border: ["White", "Ivory", "Clear"].includes(
                                  color,
                                )
                                  ? "1.5px solid #d1d5db"
                                  : "1.5px solid transparent",
                                flexShrink: 0,
                                display: "inline-block",
                              }}
                            />
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected summary */}
                  <div
                    style={{
                      fontSize: ".72rem",
                      color: "#7c3aed",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: ".3rem",
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: FOLDER_COLOR_SWATCHES[noFolderColor],
                        border: ["White", "Ivory", "Clear"].includes(
                          noFolderColor,
                        )
                          ? "1px solid #d1d5db"
                          : "none",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {noFolderColor} · {noFolderSize} · {noFolderQty} pc · ₱
                    {(sp(prices.folder, 10) * noFolderQty).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Specifications</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your order or type N/A."
              value={noSpecs}
              onChange={(e) => setNoSpecs(e.target.value)}
              rows={4}
            />
          </div>

          <div className="btn-row between">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep(0)}
            >
              ← Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (validateStep(2)) setStep(2);
              }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* ── Step 2: Files + Payment + Summary ── */}
        <div className={`step-box ${step === 2 ? "active" : ""}`}>
          {/* File upload */}
          <div className="form-group">
            <label className="form-label">
              Upload Files{" "}
              <span
                style={{
                  fontSize: ".6rem",
                  color: "var(--muted)",
                  fontWeight: 400,
                  textTransform: "none",
                  letterSpacing: 0,
                  marginLeft: 5,
                }}
              >
                (PDF, JPG, PNG, DOCX)
              </span>
            </label>
            <input
              className="form-input"
              type="file"
              multiple
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0)
                  handleFileChange(e.target.files);
              }}
            />
            {noFiles && noFiles.length > 0 && (
              <div className="file-list">
                {Array.from(noFiles).map((f, fi) => {
                  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
                  const isPaged = ext === "pdf" || ext === "docx";
                  const isViewable = ["jpg", "jpeg", "png", "pdf"].includes(
                    ext,
                  );
                  return (
                    <div
                      key={`${fi}-${f.name}`}
                      className="file-item"
                      style={{ justifyContent: "space-between" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: ".35rem",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <IC.PDF />
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {f.name}
                        </span>
                        <span
                          className="file-item-badge"
                          style={
                            isPaged
                              ? {}
                              : { background: "#f3f4f6", color: "#6b7280" }
                          }
                        >
                          {ext.toUpperCase()}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: ".3rem",
                          flexShrink: 0,
                          marginLeft: ".4rem",
                        }}
                      >
                        {isViewable && (
                          <button
                            type="button"
                            title="View file"
                            onClick={() =>
                              window.open(URL.createObjectURL(f), "_blank")
                            }
                            style={{
                              color: "#7c3aed",
                              display: "flex",
                              alignItems: "center",
                              padding: "2px 4px",
                              borderRadius: 4,
                              background: "#ede9fe",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            <IC.Eye />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Remove file"
                          onClick={() => {
                            const dt = new DataTransfer();
                            Array.from(noFiles).forEach((file, i) => {
                              if (i !== fi) dt.items.add(file);
                            });
                            const newFiles =
                              dt.files.length > 0 ? dt.files : null;
                            setNoFiles(newFiles);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                            if (newFiles) handleFileChange(newFiles);
                            else {
                              setNoPdfPages(0);
                              setNoQuantity("");
                            }
                          }}
                          style={{
                            color: "#ef4444",
                            display: "flex",
                            alignItems: "center",
                            padding: "2px 4px",
                            borderRadius: 4,
                            background: "#fee2e2",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          <IC.XCircle />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: "1rem" }}>
            <div className="form-label" style={{ marginBottom: ".5rem" }}>
              Payment Method
            </div>
            <div
              style={{ display: "flex", gap: ".6rem", marginBottom: ".75rem" }}
            >
              {(["cash", "gcash"] as const).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setNoPaymentMethod(pm)}
                  style={{
                    flex: 1,
                    padding: ".65rem .5rem",
                    border: `2px solid ${noPaymentMethod === pm ? (pm === "gcash" ? "#7c3aed" : "#16a34a") : "#e5e7eb"}`,
                    borderRadius: 10,
                    background:
                      noPaymentMethod === pm
                        ? pm === "gcash"
                          ? "#f5f3ff"
                          : "#f0fdf4"
                        : "#fff",
                    cursor: "pointer",
                    fontFamily: "'Inter',sans-serif",
                    fontWeight: 700,
                    fontSize: ".82rem",
                    color:
                      noPaymentMethod === pm
                        ? pm === "gcash"
                          ? "#7c3aed"
                          : "#16a34a"
                        : "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: ".4rem",
                    transition: "all .15s",
                  }}
                >
                  {pm === "cash" ? (
                    <>
                      <IcoCash
                        size={15}
                        color={
                          noPaymentMethod === "cash" ? "#16a34a" : "#6b7280"
                        }
                      />{" "}
                      Cash on Pickup
                    </>
                  ) : (
                    <>
                      <IcoGCash
                        size={15}
                        color={
                          noPaymentMethod === "gcash" ? "#7c3aed" : "#6b7280"
                        }
                      />{" "}
                      Pay via GCash
                    </>
                  )}
                </button>
              ))}
            </div>

            {noPaymentMethod === "cash" && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1.5px solid #bbf7d0",
                  borderRadius: 10,
                  padding: ".65rem .9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: ".5rem",
                  fontSize: ".78rem",
                  color: "#374151",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Pay in cash when you pick up or receive your order. No advance
                payment needed.
              </div>
            )}

            {noPaymentMethod === "gcash" && (
              <div
                style={{
                  border: "2px solid #7c3aed",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg,#5b6dee,#7c3aed)",
                    padding: ".65rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: ".5rem",
                  }}
                >
                  <IcoGCash size={16} color="#fff" />
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: ".84rem",
                    }}
                  >
                    Pay via GCash
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "rgba(255,255,255,.2)",
                      color: "#fff",
                      fontSize: ".65rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                    }}
                  >
                    Online Payment
                  </span>
                </div>
                <div style={{ padding: "1rem" }}>
                  <div style={{ marginBottom: "1rem" }}>
                    <div
                      style={{
                        fontSize: ".72rem",
                        fontWeight: 700,
                        color: "#374151",
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        marginBottom: ".5rem",
                      }}
                    >
                      How much would you like to pay?
                    </div>
                    <div style={{ display: "flex", gap: ".5rem" }}>
                      {[
                        {
                          val: "full" as const,
                          label: "Full Payment",
                          sub: `₱${summaryTotal.toFixed(2)}`,
                          icon: <IcoFullPayment />,
                          disabled: false,
                        },
                        {
                          val: "downpayment" as const,
                          label: "Downpayment (50%)",
                          sub:
                            summaryTotal >= 500
                              ? `₱${(summaryTotal * 0.5).toFixed(2)}`
                              : "Only for ₱500+",
                          icon: <IcoDownpayment />,
                          disabled: summaryTotal < 500,
                        },
                      ].map(({ val, label, sub, icon, disabled }) => (
                        <button
                          key={val}
                          type="button"
                          disabled={!!disabled}
                          onClick={() => !disabled && setNoGcashPayType(val)}
                          style={{
                            flex: 1,
                            padding: ".6rem .5rem",
                            border: `2px solid ${noGcashPayType === val && !disabled ? "#7c3aed" : "#e5e7eb"}`,
                            borderRadius: 10,
                            background:
                              noGcashPayType === val && !disabled
                                ? "#f5f3ff"
                                : disabled
                                  ? "#f9fafb"
                                  : "#fff",
                            cursor: disabled ? "not-allowed" : "pointer",
                            fontFamily: "'Inter',sans-serif",
                            transition: "all .15s",
                            opacity: disabled ? 0.45 : 1,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginBottom: 4,
                              color:
                                noGcashPayType === val && !disabled
                                  ? "#7c3aed"
                                  : "#9ca3af",
                            }}
                          >
                            {icon}
                          </div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: ".76rem",
                              color:
                                noGcashPayType === val && !disabled
                                  ? "#7c3aed"
                                  : "#374151",
                            }}
                          >
                            {label}
                          </div>
                          <div
                            style={{
                              fontSize: ".68rem",
                              color:
                                noGcashPayType === val && !disabled
                                  ? "#7c3aed"
                                  : "#9ca3af",
                              fontWeight: 600,
                              marginTop: 1,
                            }}
                          >
                            {sub}
                          </div>
                        </button>
                      ))}
                    </div>
                    {noGcashPayType === "downpayment" &&
                      summaryTotal >= 500 && (
                        <div
                          style={{
                            marginTop: ".5rem",
                            background: "#fffbeb",
                            border: "1px solid #fcd34d",
                            borderRadius: 8,
                            padding: ".45rem .7rem",
                            fontSize: ".72rem",
                            color: "#92400e",
                            display: "flex",
                            alignItems: "center",
                            gap: ".4rem",
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <IcoWarning />
                          </span>
                          Balance of{" "}
                          <strong>₱{(summaryTotal * 0.5).toFixed(2)}</strong> is
                          due on pickup/delivery.
                        </div>
                      )}
                  </div>

                  <div
                    style={{
                      background: "#f5f3ff",
                      border: "1.5px solid #ddd6fe",
                      borderRadius: 8,
                      padding: ".5rem .85rem",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: ".76rem",
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      Send exactly:
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: "1.05rem",
                        color: "#7c3aed",
                      }}
                    >
                      ₱
                      {(noGcashPayType === "downpayment" && summaryTotal >= 500
                        ? summaryTotal * 0.5
                        : summaryTotal
                      ).toFixed(2)}
                    </span>
                  </div>

                  {/* QR Step */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: ".6rem",
                      marginBottom: ".85rem",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "#7c3aed",
                        color: "#fff",
                        fontSize: ".7rem",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      1
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: ".8rem",
                          color: "#111827",
                          marginBottom: ".4rem",
                        }}
                      >
                        Scan the GCash QR Code
                      </div>
                      <div
                        style={{
                          background: "#fff",
                          border: "2px solid #e5e7eb",
                          borderRadius: 10,
                          padding: ".75rem",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: ".5rem",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            width: 200,
                            height: 200,
                          }}
                        >
                          <img
                            src="/gcash-qr.jpg"
                            alt="GCash QR Code"
                            style={{
                              width: 200,
                              height: 200,
                              objectFit: "contain",
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              display: "block",
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                              const fb =
                                document.getElementById("gcash-qr-fallback");
                              if (fb) fb.style.display = "flex";
                            }}
                          />
                          <div
                            id="gcash-qr-fallback"
                            style={{
                              width: 200,
                              height: 200,
                              background: "#f3f4f6",
                              border: "2px dashed #d1d5db",
                              borderRadius: 8,
                              display: "none",
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "column",
                              gap: 4,
                              position: "absolute",
                              top: 0,
                              left: 0,
                            }}
                          >
                            <IcoGCash size={32} color="#9ca3af" />
                            <span
                              style={{
                                fontSize: ".65rem",
                                color: "#9ca3af",
                                textAlign: "center",
                              }}
                            >
                              Place gcash-qr.jpg in
                              <br />
                              your /public folder
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: ".72rem",
                            color: "#6b7280",
                            textAlign: "center",
                            lineHeight: 1.4,
                          }}
                        >
                          Open GCash → Scan QR
                          <br />
                          <strong style={{ color: "#7c3aed" }}>
                            Jonayskie Prints
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ref number */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: ".6rem",
                      marginBottom: ".85rem",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "#7c3aed",
                        color: "#fff",
                        fontSize: ".7rem",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      2
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: ".8rem",
                          color: "#111827",
                          marginBottom: ".35rem",
                        }}
                      >
                        Enter GCash Reference Number
                      </div>
                      <input
                        className="form-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="e.g. 1234567890123"
                        value={noGcashRefNum}
                        onChange={(e) =>
                          setNoGcashRefNum(
                            e.target.value.replace(/[^0-9]/g, ""),
                          )
                        }
                        maxLength={20}
                        style={{ fontSize: "max(16px,.875rem)" }}
                      />
                      <div className="hint-text">
                        Found in your GCash transaction receipt
                      </div>
                    </div>
                  </div>

                  {/* Receipt upload */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: ".6rem",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "#7c3aed",
                        color: "#fff",
                        fontSize: ".7rem",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      3
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: ".8rem",
                          color: "#111827",
                          marginBottom: ".35rem",
                        }}
                      >
                        Upload GCash Receipt Screenshot{" "}
                        <span style={{ color: "#ef4444" }}>*</span>
                      </div>
                      <input
                        ref={gcashReceiptRef}
                        className="form-input"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setNoGcashReceipt(file);
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) =>
                              setNoGcashReceiptPreview(
                                ev.target?.result as string,
                              );
                            reader.readAsDataURL(file);
                          } else setNoGcashReceiptPreview(null);
                        }}
                      />
                      {noGcashReceiptPreview && (
                        <div
                          style={{
                            marginTop: ".5rem",
                            position: "relative",
                            display: "inline-block",
                          }}
                        >
                          <img
                            src={noGcashReceiptPreview}
                            alt="Receipt preview"
                            style={{
                              width: "100%",
                              maxWidth: 200,
                              borderRadius: 8,
                              border: "2px solid #22c55e",
                              display: "block",
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              background: "#22c55e",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#fff"
                              strokeWidth="3"
                              strokeLinecap="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNoGcashReceipt(null);
                              setNoGcashReceiptPreview(null);
                              if (gcashReceiptRef.current)
                                gcashReceiptRef.current.value = "";
                            }}
                            style={{
                              position: "absolute",
                              top: 4,
                              left: 4,
                              background: "rgba(0,0,0,.55)",
                              border: "none",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "#fff",
                              fontSize: "10px",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      <div className="hint-text">
                        Screenshot of your GCash payment confirmation
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="sum-box">
            <div
              style={{
                fontWeight: 700,
                fontSize: ".85rem",
                marginBottom: ".75rem",
                color: "var(--text)",
                display: "flex",
                alignItems: "center",
                gap: ".4rem",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Order Summary
            </div>

            <div
              style={{
                background: "#f5f3ff",
                borderRadius: 8,
                padding: ".55rem .75rem",
                marginBottom: ".65rem",
              }}
            >
              <div className="sum-row" style={{ paddingBottom: 2 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>
                  Service
                </span>
                <span style={{ fontWeight: 700, color: "#7c3aed" }}>
                  {noService || "—"}
                </span>
              </div>
              <div className="sum-row">
                <span>Delivery</span>
                <span>
                  {noDelivery.charAt(0).toUpperCase() + noDelivery.slice(1)}
                </span>
              </div>
              {noDelivery === "pickup" && noPickupTime && (
                <div className="sum-row">
                  <span>Pickup Time</span>
                  <span style={{ color: "#7c3aed", fontWeight: 600 }}>
                    {formatPickupTime(noPickupTime)}
                  </span>
                </div>
              )}
              {showsPaper && (
                <div className="sum-row">
                  <span>Paper Size</span>
                  <span>
                    {noPaperSize}
                    {noPaperSize === "Long" ? " (+20%)" : ""}
                  </span>
                </div>
              )}
              {showsPhoto && (
                <div className="sum-row">
                  <span>Photo Size</span>
                  <span>Glossy {noPhotoSize}</span>
                </div>
              )}
              {showsColor && (
                <div className="sum-row">
                  <span>Print Type</span>
                  <span>{noColorOption === "color" ? "Color" : "B&W"}</span>
                </div>
              )}
              {noFolder && (
                <div className="sum-row">
                  <span>Folder</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".3rem",
                      color: "#7c3aed",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: FOLDER_COLOR_SWATCHES[noFolderColor],
                        border: ["White", "Ivory", "Clear"].includes(
                          noFolderColor,
                        )
                          ? "1px solid #d1d5db"
                          : "none",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {noFolderColor} · {noFolderSize} · {noFolderQty} pc
                  </span>
                </div>
              )}
            </div>

            {/* Price breakdown */}
            <div
              style={{
                borderTop: "1px dashed #e5e7eb",
                paddingTop: ".6rem",
                marginBottom: ".5rem",
              }}
            >
              <div
                style={{
                  fontSize: ".63rem",
                  fontWeight: 700,
                  letterSpacing: ".07em",
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: ".4rem",
                }}
              >
                Price Breakdown
              </div>
              {noService &&
                effectiveQuantity >= 1 &&
                (() => {
                  const sl = noService.toLowerCase().trim();
                  const m = PAPER_MULTIPLIERS[noPaperSize] ?? 1.0;
                  let unitPrice = 0,
                    priceLabel = "";
                  if (sl === "print") {
                    unitPrice =
                      (noColorOption === "color"
                        ? sp(prices.print_color, 2)
                        : sp(prices.print_bw, 1)) * m;
                    priceLabel = `₱${(noColorOption === "color" ? sp(prices.print_color, 2) : sp(prices.print_bw, 1)).toFixed(2)}/page${noPaperSize === "Long" ? " × 1.2 (Long)" : ""}`;
                  } else if (sl === "photocopy") {
                    unitPrice = sp(prices.photocopying, 2) * m;
                    priceLabel = `₱${sp(prices.photocopying, 2).toFixed(2)}/page${noPaperSize === "Long" ? " × 1.2 (Long)" : ""}`;
                  } else if (sl === "scanning") {
                    unitPrice = sp(prices.scanning, 5) * m;
                    priceLabel = `₱${sp(prices.scanning, 5).toFixed(2)}/page${noPaperSize === "Long" ? " × 1.2 (Long)" : ""}`;
                  } else if (sl === "photo development") {
                    unitPrice = sp(prices.photo_development, 15);
                    priceLabel = `₱${sp(prices.photo_development, 15).toFixed(2)}/photo`;
                  } else if (sl === "laminating") {
                    unitPrice = sp(prices.laminating, 20);
                    priceLabel = `₱${sp(prices.laminating, 20).toFixed(2)}/item`;
                  }
                  const baseTotal = unitPrice * effectiveQuantity;
                  return (
                    <div
                      className="sum-row"
                      style={{ padding: "4px 0", alignItems: "flex-start" }}
                    >
                      <span style={{ flex: 1 }}>
                        {noService}
                        {showsCopies && noPdfPages > 0 && (
                          <span
                            style={{
                              display: "block",
                              fontSize: ".63rem",
                              color: "#9ca3af",
                              marginTop: 1,
                            }}
                          >
                            {noPdfPages} pages × {noCopies} copies × ₱
                            {(
                              (sl === "print"
                                ? noColorOption === "color"
                                  ? sp(prices.print_color, 2)
                                  : sp(prices.print_bw, 1)
                                : sp(prices.photocopying, 2)) *
                              (PAPER_MULTIPLIERS[noPaperSize] ?? 1)
                            ).toFixed(2)}
                            /page
                          </span>
                        )}
                        {showsCopies && noPdfPages === 0 && (
                          <span
                            style={{
                              display: "block",
                              fontSize: ".63rem",
                              color: "#9ca3af",
                              marginTop: 1,
                            }}
                          >
                            {effectiveQuantity} copies × ₱
                            {(
                              (sl === "print"
                                ? noColorOption === "color"
                                  ? sp(prices.print_color, 2)
                                  : sp(prices.print_bw, 1)
                                : sp(prices.photocopying, 2)) *
                              (PAPER_MULTIPLIERS[noPaperSize] ?? 1)
                            ).toFixed(2)}
                            /page
                          </span>
                        )}
                        {!showsCopies && (
                          <span
                            style={{
                              display: "block",
                              fontSize: ".63rem",
                              color: "#9ca3af",
                              marginTop: 1,
                            }}
                          >
                            {effectiveQuantity} × {priceLabel}
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#111827",
                          whiteSpace: "nowrap",
                          paddingLeft: 8,
                        }}
                      >
                        ₱{baseTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })()}
              {noLamination &&
                noService.toLowerCase() !== "laminating" &&
                effectiveQuantity >= 1 && (
                  <div className="sum-row" style={{ padding: "4px 0" }}>
                    <span>
                      Lamination add-on{" "}
                      <span style={{ fontSize: ".63rem", color: "#9ca3af" }}>
                        {effectiveQuantity} × ₱
                        {sp(prices.laminating, 20).toFixed(2)}
                      </span>
                    </span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      ₱
                      {(sp(prices.laminating, 20) * effectiveQuantity).toFixed(
                        2,
                      )}
                    </span>
                  </div>
                )}
              {noFolder && noFolderQty >= 1 && (
                <div className="sum-row" style={{ padding: "4px 0" }}>
                  <span>
                    Folder ({noFolderColor} · {noFolderSize}){" "}
                    <span style={{ fontSize: ".63rem", color: "#9ca3af" }}>
                      {noFolderQty} × ₱{sp(prices.folder, 10).toFixed(2)}
                    </span>
                  </span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>
                    ₱{(sp(prices.folder, 10) * noFolderQty).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Total */}
            <div
              style={{
                background: "linear-gradient(135deg,#f5f3ff,#ede9fe)",
                borderRadius: 8,
                padding: ".6rem .75rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: ".3rem",
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: ".88rem",
                  color: "#374151",
                }}
              >
                Total Amount
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  color: "#7c3aed",
                  letterSpacing: "-.02em",
                }}
              >
                ₱{summaryTotal.toFixed(2)}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: ".55rem",
                padding: ".5rem .75rem",
                background: "#f9fafb",
                border: "1.5px solid #e5e7eb",
                borderRadius: 8,
                fontSize: ".75rem",
              }}
            >
              <span style={{ color: "#6b7280" }}>Payment via</span>
              <span
                style={{
                  fontWeight: 700,
                  color: noPaymentMethod === "gcash" ? "#7c3aed" : "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {noPaymentMethod === "gcash" ? (
                  <>
                    <IcoGCash size={13} color="#7c3aed" /> GCash{" "}
                    {noGcashPayType === "downpayment" && summaryTotal >= 500 ? (
                      <span style={{ fontWeight: 500, color: "#9ca3af" }}>
                        · 50% downpayment
                      </span>
                    ) : (
                      <span style={{ fontWeight: 500, color: "#9ca3af" }}>
                        · full payment
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <IcoCash size={13} color="#16a34a" /> Cash on Pickup
                  </>
                )}
              </span>
            </div>

            {noPaymentMethod === "gcash" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: ".4rem",
                  padding: ".5rem .75rem",
                  background: "#f5f3ff",
                  border: "1.5px solid #ddd6fe",
                  borderRadius: 8,
                  fontSize: ".75rem",
                }}
              >
                <span style={{ color: "#7c3aed", fontWeight: 600 }}>
                  Send via GCash now:
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    color: "#7c3aed",
                    fontSize: ".9rem",
                  }}
                >
                  ₱
                  {(noGcashPayType === "downpayment" && summaryTotal >= 500
                    ? summaryTotal * 0.5
                    : summaryTotal
                  ).toFixed(2)}
                </span>
              </div>
            )}

            {noPaymentMethod === "gcash" &&
              noGcashPayType === "downpayment" &&
              summaryTotal >= 500 && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1.5px solid #fcd34d",
                    borderRadius: 8,
                    padding: ".5rem .75rem",
                    marginTop: ".4rem",
                    fontSize: ".72rem",
                    color: "#92400e",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: ".4rem",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      paddingTop: 1,
                    }}
                  >
                    <IcoWarning />
                  </span>
                  <span>
                    Balance of{" "}
                    <strong>₱{(summaryTotal * 0.5).toFixed(2)}</strong> is due
                    upon pickup or delivery.
                  </span>
                </div>
              )}
            {noPaymentMethod === "cash" && summaryTotal >= 500 && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1.5px solid #fcd34d",
                  borderRadius: 8,
                  padding: ".5rem .75rem",
                  marginTop: ".55rem",
                  fontSize: ".72rem",
                  color: "#92400e",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: ".4rem",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    paddingTop: 1,
                  }}
                >
                  <IcoWarning />
                </span>
                <span>
                  Your order exceeds <strong>₱500.00</strong>. A{" "}
                  <strong>
                    50% GCash downpayment of ₱{(summaryTotal * 0.5).toFixed(2)}
                  </strong>{" "}
                  is required before processing. Switch to GCash above to pay
                  now. Remaining cash balance of{" "}
                  <strong>₱{(summaryTotal * 0.5).toFixed(2)}</strong> is due on
                  pickup/delivery.
                </span>
              </div>
            )}
          </div>

          <div className="btn-row between" style={{ marginTop: ".9rem" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={
                noSubmitting ||
                (noPaymentMethod === "cash" && summaryTotal >= 500)
              }
              title={
                noPaymentMethod === "cash" && summaryTotal >= 500
                  ? "Switch to GCash to proceed — downpayment required for orders over ₱500"
                  : undefined
              }
            >
              {noSubmitting ? "Placing..." : "Place Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
