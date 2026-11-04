const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const TEXT_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.csv', '.json', '.js', '.jsx', '.ts', '.tsx', '.py',
  '.html', '.css', '.yml', '.yaml', '.sh', '.sql', '.xml', '.log', '.env', '.go', '.rb',
]
const MAX_FILES = 3
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TEXT_CHARS = 20000
const MAX_IMAGE_EDGE = 1400

export const ATTACHMENT_LIMITS = { MAX_FILES }

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID()
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

function shrinkImage(dataUrl, type) {
  if (type === 'image/gif') return Promise.resolve(dataUrl)
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const longest = Math.max(image.width, image.height)
      const scale = Math.min(1, MAX_IMAGE_EDGE / longest)
      if (scale === 1 && dataUrl.length < 700_000) {
        resolve(dataUrl)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        resolve(dataUrl)
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}

async function fileToAttachment(file) {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 8 MB.`)

  const isImage = IMAGE_TYPES.includes(file.type)
  const isTextType = file.type.startsWith('text/') || file.type === 'application/json'
  const hasTextExtension = TEXT_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension)
  )

  if (isImage) {
    const original = await readAsDataUrl(file)
    const dataUrl = await shrinkImage(original, file.type)
    return {
      id: makeId(),
      kind: 'image',
      name: file.name || 'image',
      type: 'image/jpeg',
      size: file.size,
      dataUrl,
    }
  }

  if (isTextType || hasTextExtension) {
    const text = (await file.text()).slice(0, MAX_TEXT_CHARS)
    if (!text.trim()) throw new Error(`${file.name} looks empty.`)
    return {
      id: makeId(),
      kind: 'text',
      name: file.name,
      type: file.type || 'text/plain',
      size: file.size,
      text,
    }
  }

  throw new Error(`${file.name} isn't supported. Attach an image or a text/code file.`)
}

export async function readAttachments(fileList, existingCount = 0) {
  const room = Math.max(0, MAX_FILES - existingCount)
  const files = Array.from(fileList || []).slice(0, room)
  const attachments = []
  const errors = []

  for (const file of files) {
    try {
      attachments.push(await fileToAttachment(file))
    } catch (error) {
      errors.push(error.message)
    }
  }

  if (Array.from(fileList || []).length > room) {
    errors.push(`You can attach up to ${MAX_FILES} files per message.`)
  }

  return { attachments, errors }
}
