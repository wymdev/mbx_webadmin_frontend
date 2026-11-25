/**
 * Uploads are shrunk in the browser first: the API server receives data slowly (about 40 KB/s),
 * so a phone photo of a few MB would time out, while a resized copy is a few dozen KB.
 */

type ShrinkOptions = {
  /** Longest side in pixels after resizing. */
  maxSide: number
  /** Keep transparency (logos, flags). Photos get a white background instead. */
  keepAlpha?: boolean
  quality?: number
}

/** Files at or under this size are sent as they are when they already fit `maxSide`. */
const SMALL_ENOUGH = 200_000

function encode(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * A resized copy of an image, or the original when it is already small, is a GIF (may be
 * animated), can't be decoded, or the copy would not be smaller.
 */
export async function shrinkImage(file: File, { maxSide, keepAlpha = false, quality = 0.85 }: ShrinkOptions): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size <= SMALL_ENOUGH) {
    bitmap.close()
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return file
  }
  if (!keepAlpha) {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  // WebP keeps transparency and is small. Browsers that can't encode it return PNG instead:
  // fine for logos and flags, but photos then go out as JPEG.
  let blob = await encode(canvas, 'image/webp', quality)
  if (blob && blob.type !== 'image/webp' && !keepAlpha) blob = await encode(canvas, 'image/jpeg', quality)
  if (!blob || blob.size >= file.size) return file

  const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png'
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.${extension}`, { type: blob.type })
}

/** Swap a form's image field for its shrunk copy, or drop the field when no file was chosen. */
export async function prepareImageField(form: FormData, field: string, options: ShrinkOptions) {
  const file = form.get(field)
  if (!(file instanceof File)) return
  if (!file.size) {
    form.delete(field)
    return
  }
  form.set(field, await shrinkImage(file, options))
}
