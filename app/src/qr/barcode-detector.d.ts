// Tarayıcının kendi QR okuyucusu (Shape Detection API). TypeScript'in hazır tanımlarında yok;
// yalnızca kullandığımız kadarını tanımlıyoruz.
interface BarcodeDetectorSonucu {
  rawValue: string;
  format: string;
}

declare class BarcodeDetector {
  constructor(secenekler?: { formats?: string[] });
  detect(kaynak: ImageBitmapSource): Promise<BarcodeDetectorSonucu[]>;
  static getSupportedFormats(): Promise<string[]>;
}
