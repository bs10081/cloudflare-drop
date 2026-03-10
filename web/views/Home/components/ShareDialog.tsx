import { useRef } from 'preact/hooks'
import { observer } from 'mobx-react-lite'
import { DialogProps } from '@toolpad/core/useDialogs'
import Box from '@mui/material/Box'
// import DialogActions from '@mui/material/DialogActions'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import QrCode from 'qrcode-svg'

import { copyToClipboard } from '../../../common.ts'
import { BasicDialog } from './BasicDialog.tsx'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

import { Code } from './index.tsx'
import { useTranslation } from '../../../i18n'

dayjs.extend(relativeTime)

export const ShareDialog = observer(
  ({
    open,
    onClose,
    payload,
  }: DialogProps<
    FileUploadedType & {
      message: {
        error(message: string): void
        success(message: string): void
      }
    }
  >) => {
    const { t } = useTranslation()
    const url = `${window.location.protocol}//${window.location.host}?code=${payload.code}`
    const desc = `${t('common', 'link')}: ${url} ${t('common', 'extractCode')}: ${payload.code} ${payload.is_encrypted ? '' : `SHA256 Hash: ${payload.hash}`} `
    const qr = useRef(
      new QrCode({
        content: url,
      }).svg(),
    )

    const handleCopy = (str: string) => {
      copyToClipboard(str)
        .then(() => {
          payload.message.success(t('common', 'copySuccess'))
        })
        .catch(() => {
          payload.message.error(t('common', 'copyFailed'))
        })
    }

    return (
      <BasicDialog
        open={open}
        onClose={onClose}
        title={t('shareDialog', 'title')}
      >
        <Box>
          <Box
            className="relative"
            sx={{
              '&::after': {
                display: 'block',
                position: 'absolute',
                content: '" "',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              },
            }}
            onClick={() => handleCopy(payload.code)}
          >
            <Code disabled length={6} value={payload.code} />
          </Box>
          <Box
            sx={{ mt: 2 }}
            className="flex justify-center"
            dangerouslySetInnerHTML={{ __html: qr.current }}
          />

          <Box sx={{ mt: 2 }}>
            <TextField
              multiline
              fullWidth
              rows={4}
              value={desc}
              disabled
              sx={(theme) => ({
                '& .MuiInputBase-root': {
                  color: theme.palette.text.primary,
                },
                textarea: {
                  WebkitTextFillColor: 'currentColor !important',
                },
              })}
            />
            <Button
              variant="contained"
              onClick={() => handleCopy(desc)}
              sx={(theme) => ({
                mt: 2,
                pl: 4,
                pr: 4,
                [theme.breakpoints.down('sm')]: {
                  width: '100%',
                },
              })}
            >
              {t('common', 'copy')}
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textDisabled">
              {t('shareDialog', 'hashLabel')}{' '}
              <a target="_blank" href="https://www.lzltool.com/data-hash">
                ({t('common', 'verifyTool')})
              </a>
              {'：'}
            </Typography>
            <Typography
              className="mt-1"
              variant="body2"
              onClick={() => handleCopy(payload.hash)}
              sx={{
                wordBreak: 'break-all',
              }}
            >
              {payload.hash}
            </Typography>
            {}
            <Typography className="mt-1" variant="body2" color="textDisabled">
              {payload.due_date
                ? t('duration', 'expiresAt')
                : t('duration', 'permanentValidity')}
            </Typography>
            {payload.due_date && (
              <Typography className="mt-1" variant="body2">
                {dayjs(payload.due_date).fromNow()}
              </Typography>
            )}
          </Box>
        </Box>
      </BasicDialog>
    )
  },
)
