import { useEffect, useState } from 'preact/hooks'
import { DialogProps } from '@toolpad/core/useDialogs'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
// import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import zh from 'dayjs/locale/zh-tw'

import { fetchPlainText } from '../api'
import { copyToClipboard } from '../common'
import { BasicDialog } from './BasicDialog'

dayjs.extend(relativeTime)
dayjs.locale(zh)

export function FileDialog({
  open,
  onClose,
  payload,
}: DialogProps<
  FileType & {
    message: {
      error(message: string): void
      success(message: string): void
    }
  }
>) {
  const isText = payload.type === 'plain/string'
  const [text, updateText] = useState('')

  const handleCopy = (str: string) => {
    copyToClipboard(str)
      .then(() => {
        payload.message.success('複製成功')
      })
      .catch(() => {
        payload.message.success('複製失敗')
      })
  }

  useEffect(() => {
    if (isText) {
      ;(async () => {
        const data = await fetchPlainText(payload.id)
        updateText(data)
      })()
    }
  }, [])

  return (
    <BasicDialog
      open={open}
      onClose={onClose}
      title={isText ? '文字分享' : '檔案分享'}
    >
      <Box>
        {isText && (
          <Box>
            <TextField
              multiline
              fullWidth
              rows={10}
              value={text}
              disabled
              sx={(theme) => ({
                '& .MuiInputBase-root': {
                  color: theme.palette.text.primary,
                },
                textarea: {
                  '-webkit-text-fill-color': 'currentColor !important',
                },
              })}
            />
            <Button
              variant="contained"
              onClick={() => handleCopy(text)}
              sx={(theme) => ({
                mt: 2,
                pl: 4,
                pr: 4,
                [theme.breakpoints.down('sm')]: {
                  width: '100%',
                },
              })}
            >
              複製
            </Button>
          </Box>
        )}
        {!isText && (
          <Box
            className="flex items-center justify-center w-full"
            sx={{ p: 2 }}
          >
            <Button
              variant="contained"
              href={`/files/${payload.id}`}
              sx={(theme) => ({
                mt: 2,
                pl: 4,
                pr: 4,
                width: 200,
                [theme.breakpoints.down('sm')]: {
                  width: '100%',
                },
              })}
            >
              下載
            </Button>
          </Box>
        )}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="textDisabled">
            原始分享 SHA1 雜湊值{' '}
            <a target="_blank" href="https://www.lzltool.com/data-hash">
              (校驗工具)
            </a>
            {'：'}
          </Typography>
          <Typography
            className="mt-1"
            variant="body2"
            onClick={() => handleCopy(payload.hash)}
          >
            {payload.hash}
          </Typography>
          <Typography className="mt-1" variant="body2" color="textDisabled">
            預計過期於：
          </Typography>
          <Typography className="mt-1" variant="body2">
            {dayjs(payload.due_date).fromNow()}
          </Typography>
        </Box>
      </Box>
    </BasicDialog>
  )
}
