import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchFileByShareCode, fetchPlainText } from '../../api'
import { FileType } from '../../api/types'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { useToast } from '../../components/ui/use-toast'

export default function SharePage() {
  const { code } = useParams()
  const { toast } = useToast()
  const [file, setFile] = useState<FileType | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!code) return

    fetchFileByShareCode(code)
      .then((response) => {
        if (!response.result) {
          toast({
            title: '檔案不存在',
            description: response.message,
            variant: 'destructive',
          })
          return
        }

        setFile(response.data!)

        if (response.data?.type === 'text/plain') {
          fetchPlainText(response.data.id)
            .then((text) => setText(text))
            .catch((error) => {
              toast({
                title: '讀取文字失敗',
                description: error instanceof Error ? error.message : '未知錯誤',
                variant: 'destructive',
              })
            })
        }
      })
      .catch((error) => {
        toast({
          title: '讀取檔案失敗',
          description: error instanceof Error ? error.message : '未知錯誤',
          variant: 'destructive',
        })
      })
      .finally(() => setIsLoading(false))
  }, [code, toast])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>讀取中...</p>
      </div>
    )
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>檔案不存在</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">檔案資訊</h1>
            <p>檔案名稱：{file.filename || '未命名'}</p>
            <p>檔案類型：{file.type || '未知'}</p>
            <p>
              過期時間：
              {new Date(file.due_date * 1000).toLocaleString('zh-TW', {
                timeZone: 'Asia/Taipei',
              })}
            </p>
          </div>

          {text ? (
            <div className="space-y-2">
              <h2 className="text-xl font-bold">文字內容</h2>
              <pre className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                {text}
              </pre>
            </div>
          ) : (
            <div className="space-y-2">
              <Button asChild>
                <a href={`/files/${file.id}`} target="_blank" rel="noreferrer">
                  下載檔案
                </a>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
} 