export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function isImageTooLarge(fileSize?: number): boolean {
  return !!fileSize && fileSize > MAX_IMAGE_SIZE_BYTES;
}
