import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { upload } from '../api'
import { FileUploadedType } from '../api/types'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'

export default function FileUpload() {
  const { toast } = useToast()
  const [text, setText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<FileUploadedType | null>(null)

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setIsUploading(true)
    try {
      const file = acceptedFiles[0]
      const response = await upload(file)

      if (!response.result) {
        toast({
          title: '上傳失敗',
          description: response.message,
          variant: 'destructive',
        })
        return
      }

      setUploadedFile(response.data!)
      toast({
        title: '上傳成功',
        description: '檔案已上傳完成',
      })
    } catch (error) {
      toast({
        title: '上傳失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: isUploading,
  })

  const onTextSubmit = async () => {
    if (!text) return

    setIsUploading(true)
    try {
      const file = new File([text], 'text.txt', { type: 'text/plain' })
      const response = await upload(file)

      if (!response.result) {
        toast({
          title: '上傳失敗',
          description: response.message,
          variant: 'destructive',
        })
        return
      }

      setUploadedFile(response.data!)
      toast({
        title: '上傳成功',
        description: '文字已上傳完成',
      })
    } catch (error) {
      toast({
        title: '上傳失敗',
        description: error instanceof Error ? error.message : '未知錯誤',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>文字分享</Label>
        <Textarea
          placeholder="輸入要分享的文字"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isUploading}
        />
        <Button
          onClick={onTextSubmit}
          disabled={!text || isUploading}
          className="w-full"
        >
          {isUploading ? '上傳中...' : '分享文字'}
        </Button>
      </div>

      <div className="space-y-2">
        <Label>檔案分享</Label>
        <Card
          {...getRootProps()}
          className={`border-2 border-dashed p-4 text-center cursor-pointer ${
            isDragActive ? 'border-primary' : 'border-muted'
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>拖曳檔案到這裡</p>
          ) : (
            <p>點擊或拖曳檔案到這裡上傳</p>
          )}
        </Card>
      </div>

      {uploadedFile && (
        <div className="space-y-2">
          <Label>分享連結</Label>
          <Input
            readOnly
            value={`${window.location.origin}/share/${uploadedFile.code}`}
            onClick={(e) => e.currentTarget.select()}
          />
          <p className="text-sm text-muted-foreground">
            連結將在{' '}
            {new Date(uploadedFile.due_date * 1000).toLocaleString('zh-TW', {
              timeZone: 'Asia/Taipei',
            })}{' '}
            過期
          </p>
        </div>
      )}
    </div>
  )
} 