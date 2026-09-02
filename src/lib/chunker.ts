/**
 * [ÖĞRENME NOTU: Neden Overlap (Örtüşme) Kullanıyoruz?]
 * Eğer metni tam 500. kelimeden 'bıçak gibi' kesersek, o noktada bir cümlenin
 * ilk yarısı bir chunk'ta, ikinci yarısı diğer chunk'ta kalabilir ve anlam kaybı yaşanır.
 * 'overlap' parametresi (örneğin 100 karakter), bir önceki parçanın sonunu
 * yeni parçanın başına ekleyerek bağlamın (context) kopmasını engeller.
 */

interface ChunkOptions {
  chunkSize?: number; // Parça boyutu (ortalama karakter)
  chunkOverlap?: number; // İki parça arasındaki örtüşme miktarı
}

export function splitTextIntoChunks(
  text: string,
  options: ChunkOptions = {},
): string[] {
  const { chunkSize = 800, chunkOverlap = 150 } = options;

  // Fazla boşlukları ve satır atlamalarını temizle
  const cleanedText = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];

  let startIndex = 0;

  while (startIndex < cleanedText.length) {
    let endIndex = startIndex + chunkSize;

    // Eğer son parça ise metnin sonuna kadar al
    if (endIndex >= cleanedText.length) {
      chunks.push(cleanedText.slice(startIndex));
      break;
    }

    // Kelimenin ortasından bölmemek için en yakın boşluğu bul
    const nextSpace = cleanedText.indexOf(" ", endIndex);
    if (nextSpace !== -1 && nextSpace - endIndex < 50) {
      endIndex = nextSpace;
    }

    chunks.push(cleanedText.slice(startIndex, endIndex).trim());

    // Bir sonraki adıma geçerken overlap kadar geriden başla
    startIndex = endIndex - chunkOverlap;
  }

  return chunks;
}
