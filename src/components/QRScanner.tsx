import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

const ELEMENT_ID = "qr-scan-region";

export default function QRScanner({ onResult }: { onResult: (unitId: string) => void }) {
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      ELEMENT_ID,
      {
        fps: 10,
        qrbox: 240,
        rememberLastUsedCamera: true,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA, Html5QrcodeScanType.SCAN_TYPE_FILE],
      },
      false
    );

    scanner.render(
      (decodedText) => {
        const m = decodedText.match(/unit-(\d{1,3})/i);
        if (m) {
          const id = m[1].padStart(2, "0");
          onResultRef.current(id);
        }
      },
      () => {
        // ignore per-frame decode errors
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return <div id={ELEMENT_ID} style={{ borderRadius: 12, overflow: "hidden" }} />;
}
