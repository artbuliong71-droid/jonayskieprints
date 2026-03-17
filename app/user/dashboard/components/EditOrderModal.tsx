"use client";

import { useRef } from "react";
import {
  Order,
  Prices,
  PaperSize,
  ColorOption,
  DeliveryOption,
  SERVICES,
  sp,
  formatPickupTime,
  displayId,
  deleteOrderFile,
} from "./types";
import { IC } from "./icons";
import { PickupTimeDropdown } from "./ui";

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

interface EditOrderModalProps {
  editOrder: Partial<Order>;
  // service / qty
  eoService: string;
  setEoService: (v: string) => void;
  eoQuantity: number | "";
  setEoQuantity: (v: number | "") => void;
  eoCopies: number | "";
  setEoCopies: (v: number | "") => void;
  eoPdfPages: number;
  setEoPdfPages: (v: number) => void;
  // delivery
  eoDelivery: DeliveryOption;
  setEoDelivery: (v: DeliveryOption) => void;
  eoAddress: string;
  setEoAddress: (v: string) => void;
  eoPickupTime: string;
  setEoPickupTime: (v: string) => void;
  // print options
  eoPaperSize: PaperSize;
  setEoPaperSize: (v: PaperSize) => void;
  eoPhotoSize: string;
  setEoPhotoSize: (v: string) => void;
  eoColorOption: ColorOption;
  setEoColorOption: (v: ColorOption) => void;
  eoLamination: boolean;
  setEoLamination: (v: boolean) => void;
  eoFolder: boolean;
  setEoFolder: (v: boolean) => void;
  eoFolderSize: string;
  setEoFolderSize: (v: string) => void;
  eoFolderQty: number;
  setEoFolderQty: (v: number) => void;
  eoFolderColor: string;
  setEoFolderColor: (v: string) => void;
  // specs / files
  eoSpecs: string;
  setEoSpecs: (v: string) => void;
  eoExistingFiles: { name: string; url: string; type: string }[];
  setEoExistingFiles: (
    v: { name: string; url: string; type: string }[],
  ) => void;
  eoNewFiles: FileList | null;
  setEoNewFiles: (v: FileList | null) => void;
  editFileInputRef: React.RefObject<HTMLInputElement | null>;
  // submit
  eoSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  // helpers
  prices: Prices;
  handleEditFileChange: (files: FileList | null) => void;
  handleEoCopiesChange: (val: number | "") => void;
}

export function EditOrderModal({
  editOrder,
  eoService,
  setEoService,
  eoQuantity,
  setEoQuantity,
  eoCopies,
  setEoCopies,
  eoPdfPages,
  setEoPdfPages,
  eoDelivery,
  setEoDelivery,
  eoAddress,
  setEoAddress,
  eoPickupTime,
  setEoPickupTime,
  eoPaperSize,
  setEoPaperSize,
  eoPhotoSize,
  setEoPhotoSize,
  eoColorOption,
  setEoColorOption,
  eoLamination,
  setEoLamination,
  eoFolder,
  setEoFolder,
  eoFolderSize,
  setEoFolderSize,
  eoFolderQty,
  setEoFolderQty,
  eoFolderColor,
  setEoFolderColor,
  eoSpecs,
  setEoSpecs,
  eoExistingFiles,
  setEoExistingFiles,
  eoNewFiles,
  setEoNewFiles,
  editFileInputRef,
  eoSubmitting,
  onSubmit,
  onClose,
  prices,
  handleEditFileChange,
  handleEoCopiesChange,
}: EditOrderModalProps) {
  const eoShowsPaper = ["Print", "Photocopy", "Scanning"].includes(eoService);
  const eoShowsPhoto = eoService === "Photo Development";
  const eoShowsColor = eoService === "Print" || eoService === "Scanning";
  const eoShowsLam = [
    "Print",
    "Photocopy",
    "Scanning",
    "Photo Development",
  ].includes(eoService);
  const eoShowsCopies = eoService === "Print" || eoService === "Photocopy";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-head">
          <div className="modal-title">
            Edit Order #{displayId(editOrder.order_id)}
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={onSubmit}>
          {/* Service */}
          <div className="form-group">
            <label className="form-label">Service</label>
            <select
              className="form-select"
              value={eoService}
              onChange={(e) => {
                setEoService(e.target.value);
                setEoColorOption(
                  e.target.value === "Photocopy" ? "color" : "bw",
                );
                setEoLamination(false);
                setEoPdfPages(0);
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

          {/* Qty + Delivery */}
          <div className="form-row-2">
            {eoShowsCopies ? (
              <div className="form-group">
                <label className="form-label">Number of Copies</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="e.g. 3"
                  value={eoCopies}
                  onChange={(e) => {
                    const val =
                      e.target.value === ""
                        ? ""
                        : Math.max(1, parseInt(e.target.value) || 1);
                    handleEoCopiesChange(val);
                  }}
                />
                {eoPdfPages > 0 && Number(eoCopies) > 0 && (
                  <div className="copies-info">
                    ✓ {eoPdfPages} pages × {eoCopies} copies ={" "}
                    {eoPdfPages * Number(eoCopies)} total
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <input
                  className="form-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="Enter quantity"
                  value={eoQuantity}
                  onChange={(e) => {
                    setEoQuantity(
                      e.target.value === ""
                        ? ""
                        : Math.max(1, parseInt(e.target.value) || 1),
                    );
                    setEoPdfPages(0);
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
                      name="eo_del"
                      value={d}
                      checked={eoDelivery === d}
                      onChange={() => {
                        setEoDelivery(d);
                        setEoPickupTime("");
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

          {eoDelivery === "delivery" && (
            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <textarea
                className="form-textarea"
                value={eoAddress}
                onChange={(e) => setEoAddress(e.target.value)}
              />
            </div>
          )}

          {eoDelivery === "pickup" && (
            <div className="form-group">
              <label
                className="form-label"
                style={{ display: "flex", alignItems: "center", gap: ".35rem" }}
              >
                <IC.ClockSmall /> Preferred Pickup Time
              </label>
              <PickupTimeDropdown
                value={eoPickupTime}
                onChange={setEoPickupTime}
              />
              <div className="hint-text">Business hours: 8:00 AM – 6:00 PM</div>
              {eoPickupTime && (
                <div className="pickup-time-box">
                  <IC.ClockSmall /> Pickup at {formatPickupTime(eoPickupTime)}
                </div>
              )}
            </div>
          )}

          {/* Print options */}
          {eoShowsPaper && (
            <div className="form-group">
              <label className="form-label">Paper Size</label>
              <select
                className="form-select"
                value={eoPaperSize}
                onChange={(e) => setEoPaperSize(e.target.value as PaperSize)}
              >
                {(["A4", "Short", "Long"] as PaperSize[]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          {eoShowsPhoto && (
            <div className="form-group">
              <label className="form-label">Photo Size</label>
              <select
                className="form-select"
                value={eoPhotoSize}
                onChange={(e) => setEoPhotoSize(e.target.value)}
              >
                <option value="A4">Glossy A4</option>
                <option value="4x6">Glossy 4x6</option>
              </select>
            </div>
          )}
          {eoShowsColor && (
            <div className="form-group">
              <label className="form-label">Print Type</label>
              <div className="radio-group" style={{ marginTop: ".4rem" }}>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="eo_col"
                    value="bw"
                    checked={eoColorOption === "bw"}
                    onChange={() => setEoColorOption("bw")}
                  />{" "}
                  B&W
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="eo_col"
                    value="color"
                    checked={eoColorOption === "color"}
                    onChange={() => setEoColorOption("color")}
                  />{" "}
                  Color
                </label>
              </div>
            </div>
          )}
          {eoShowsLam && (
            <div className="form-group">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={eoLamination}
                  onChange={(e) => setEoLamination(e.target.checked)}
                />
                Add Lamination (+₱{sp(prices.laminating, 20).toFixed(2)}/item)
              </label>
            </div>
          )}
          {eoShowsLam && (
            <div className="form-group">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={eoFolder}
                  onChange={(e) => {
                    setEoFolder(e.target.checked);
                    if (!e.target.checked) {
                      setEoFolderSize("A4");
                      setEoFolderQty(1);
                      setEoFolderColor("White");
                    }
                  }}
                />
                Add Folder (+₱{sp(prices.folder, 10).toFixed(2)}/pc)
              </label>
              {eoFolder && (
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
                  <div style={{ display: "flex", gap: ".6rem" }}>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">Size</label>
                      <select
                        className="form-select"
                        value={eoFolderSize}
                        onChange={(e) => setEoFolderSize(e.target.value)}
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
                        value={eoFolderQty}
                        onChange={(e) =>
                          setEoFolderQty(
                            Math.max(1, parseInt(e.target.value) || 1),
                          )
                        }
                      />
                    </div>
                  </div>
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
                      {FOLDER_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEoFolderColor(color)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: ".3rem",
                            padding: "3px 8px 3px 4px",
                            borderRadius: 99,
                            border: `2px solid ${eoFolderColor === color ? "#7c3aed" : "#e5e7eb"}`,
                            background:
                              eoFolderColor === color ? "#f5f3ff" : "#fff",
                            cursor: "pointer",
                            fontFamily: "'Inter',sans-serif",
                            fontSize: ".72rem",
                            fontWeight: eoFolderColor === color ? 700 : 500,
                            color:
                              eoFolderColor === color ? "#7c3aed" : "#374151",
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
                      ))}
                    </div>
                  </div>
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
                        background: FOLDER_COLOR_SWATCHES[eoFolderColor],
                        border: ["White", "Ivory", "Clear"].includes(
                          eoFolderColor,
                        )
                          ? "1px solid #d1d5db"
                          : "none",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {eoFolderColor} · {eoFolderSize} · {eoFolderQty} pc · ₱
                    {(sp(prices.folder, 10) * eoFolderQty).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Specs */}
          <div className="form-group">
            <label className="form-label">Specifications</label>
            <textarea
              className="form-textarea"
              value={eoSpecs}
              onChange={(e) => setEoSpecs(e.target.value)}
              rows={3}
            />
          </div>

          {/* Files */}
          <div className="form-group">
            <label className="form-label">
              Files{" "}
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

            {/* Existing files */}
            {eoExistingFiles.length > 0 && (
              <div style={{ marginBottom: ".6rem" }}>
                <div
                  style={{
                    fontSize: ".62rem",
                    fontWeight: 700,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: "#9ca3af",
                    marginBottom: ".35rem",
                  }}
                >
                  Currently Uploaded
                </div>
                <div className="file-list">
                  {eoExistingFiles.map((f, fi) => {
                    const ext = f.name?.split(".").pop()?.toLowerCase() ?? "";
                    const isViewable = ["jpg", "jpeg", "png", "pdf"].includes(
                      ext,
                    );
                    const isPaged = ext === "pdf" || ext === "docx";
                    return (
                      <div
                        key={fi}
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
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: "#7c3aed",
                                display: "flex",
                                alignItems: "center",
                                padding: "2px 4px",
                                borderRadius: 4,
                                background: "#ede9fe",
                                textDecoration: "none",
                              }}
                            >
                              <IC.Eye />
                            </a>
                          )}
                          <button
                            type="button"
                            title="Delete file"
                            onClick={async () => {
                              if (!editOrder?.order_id) return;
                              try {
                                await deleteOrderFile(
                                  String(editOrder.order_id),
                                  f.name,
                                );
                              } catch {}
                              setEoExistingFiles(
                                eoExistingFiles.filter((_, i) => i !== fi),
                              );
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
              </div>
            )}

            {/* New files */}
            <div
              style={{
                fontSize: ".62rem",
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: ".35rem",
              }}
            >
              Add New Files
            </div>
            <input
              className="form-input"
              type="file"
              multiple
              ref={editFileInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              onChange={(e) => {
                setEoNewFiles(e.target.files);
                handleEditFileChange(e.target.files);
              }}
            />
            {eoNewFiles && eoNewFiles.length > 0 && (
              <div className="file-list">
                {Array.from(eoNewFiles).map((f, fi) => {
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
                          onClick={() => {
                            const dt = new DataTransfer();
                            Array.from(eoNewFiles).forEach((file, i) => {
                              if (i !== fi) dt.items.add(file);
                            });
                            const updated =
                              dt.files.length > 0 ? dt.files : null;
                            setEoNewFiles(updated);
                            if (editFileInputRef.current)
                              editFileInputRef.current.value = "";
                            if (updated) handleEditFileChange(updated);
                            else {
                              setEoPdfPages(0);
                              setEoQuantity("");
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
            {eoPdfPages > 0 && (
              <div className="pdf-info">
                <IC.PDF />
                {eoShowsCopies
                  ? `${eoPdfPages} pages × ${eoCopies} copies = ${eoPdfPages * Number(eoCopies)} total`
                  : `${eoPdfPages} pages detected`}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-accent btn-full"
            disabled={eoSubmitting}
          >
            {eoSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
