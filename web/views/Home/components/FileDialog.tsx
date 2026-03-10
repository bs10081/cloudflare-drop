import { useEffect, useState, useRef } from 'preact/hooks'
import { observer } from 'mobx-react-lite'
import { AxiosProgressEvent } from 'axios'
import { DialogProps } from '@toolpad/core/useDialogs'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
// import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useDialogs } from '@toolpad/core/useDialogs'
import Backdrop from '@mui/material/Backdrop'
import QrCode from 'qrcode-svg'

import { fetchFile, fetchPlainText } from '../../../api'
import { copyToClipboard } from '../../../common.ts'
import { BasicDialog } from './BasicDialog.tsx'
import { PasswordSwitch } from './PasswordSwitch.tsx'
import LockClose from '@mui/icons-material/Lock'
import LockOpen from '@mui/icons-material/LockOpen'
import { useTranslation } from '../../../i18n'

dayjs.extend(relativeTime)

export const FileDialog = observer(
  ({
    open,
    onClose,
    payload,
  }: DialogProps<
    FileType & {
      message: {
        error(message: string): void
        success(message: string): void
      }
      token?: string
    }
  >) => {
    const { t } = useTranslation()
    const dialogs = useDialogs()
    const isText = payload.type === 'plain/string'
    const [text, updateText] = useState(
      payload.is_encrypted ? t('fileDialog', 'encryptedHint') : '',
    )
    const [password, updatePassword] = useState('')
    const [backdrop] = useState(payload.is_encrypted ?? false)

    const [downloading, updateDownloading] = useState(false)
    const [progress, updateProgress] = useState(0)
    const [file, setFile] = useState<Blob | null>(null)

    const showPassword = !password && payload.is_encrypted

    const currentUrl = `${window.location.protocol}//${window.location.host}?code=${payload.code}`
    const qr = useRef(
      new QrCode({
        content: currentUrl,
        width: 200,
        height: 200,
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

    useEffect(() => {
      if (isText) {
        if (showPassword) return
        ;(async () => {
          const data = await fetchPlainText(payload.id, password, payload.token)
          updateText(data)
        })()
      }
    }, [])

    const handleClose = async () => {
      if (!payload.is_ephemeral) {
        return onClose()
      }
      const confirmed = await dialogs.confirm(
        t('fileDialog', 'burnAfterReadWarning'),
        {
          okText: t('common', 'confirm'),
          cancelText: t('common', 'cancel'),
          title: t('fileDialog', 'burnAfterReadTitle'),
        },
      )
      if (confirmed) {
        return onClose()
      }
    }

    const handlePasswordChange = async (password: string) => {
      if (!password) {
        updatePassword('')
        return
      }
      try {
        const data = await fetchPlainText(payload.id, password, payload.token)
        updateText(data)
        updatePassword(password)
      } catch (_e) {
        payload.message.error(t('password', 'decryptFailed'))
      }
    }

    const handlePasswordDownload = async (password: string) => {
      if (!password) {
        updatePassword('')
        return
      }

      try {
        if (!file) {
          updateDownloading(true)
          updateProgress(0)
        }
        const [originFile, e] = await fetchFile(
          file,
          payload.id,
          password,
          payload.filename,
          payload.token,
          (e: AxiosProgressEvent) => {
            updateProgress(e.loaded)
          },
        )
        if (!e) {
          updatePassword(password)
        } else {
          payload.message.error(t('password', 'decryptFailed'))
        }
        setFile(originFile)
      } catch (_e) {
        payload.message.error(t('password', 'decryptFailed'))
      }
      updateDownloading(false)
      updateProgress(0)
    }

    return (
      <BasicDialog
        open={open}
        onClose={handleClose}
        title={
          isText ? t('fileDialog', 'textTitle') : t('fileDialog', 'fileTitle')
        }
      >
        <Box>
          {isText && (
            <Box>
              <Box className="relative">
                <TextField
                  multiline
                  fullWidth
                  rows={10}
                  value={text}
                  disabled
                  sx={(theme) => ({
                    '& .MuiInputBase-root': {
                      color: theme.palette.text.primary,
                      filter: showPassword ? 'blur(1px)' : 'none',
                    },
                    textarea: {
                      WebkitTextFillColor: 'currentColor !important',
                    },
                  })}
                />
                {showPassword && (
                  <Backdrop
                    className="absolute"
                    sx={(theme) => ({
                      color: '#fff',
                      zIndex: theme.zIndex.drawer + 1,
                    })}
                    open={backdrop}
                  >
                    <PasswordSwitch
                      actionable
                      value={password}
                      onChange={handlePasswordChange}
                    ></PasswordSwitch>
                  </Backdrop>
                )}
              </Box>
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
                {t('common', 'copy')}
              </Button>
            </Box>
          )}
          {!isText && (
            <Box
              className="flex items-center justify-center w-full flex-col"
              sx={{ p: 2 }}
            >
              <Typography variant="caption">
                {payload.filename}
                {payload.size >= 0
                  ? ` (${(payload.size / (1000 * 1000)).toFixed(1)}M)`
                  : ''}
              </Typography>
              {!payload.is_encrypted && (
                <Button
                  target="_blank"
                  variant="contained"
                  href={`/files/${payload.id}?token=${payload.token}`}
                  sx={(theme) => ({
                    mt: 1,
                    pl: 4,
                    pr: 4,
                    width: 200,
                    [theme.breakpoints.down('sm')]: {
                      width: '100%',
                    },
                  })}
                >
                  {t('common', 'download')}
                </Button>
              )}
              {payload.is_encrypted && (
                <PasswordSwitch
                  actionable
                  value={password}
                  onChange={handlePasswordDownload}
                >
                  {(openPassword) => (
                    <Button
                      loading={downloading}
                      loadingIndicator={`${t('common', 'downloading')}(${((progress / payload.size) * 100).toFixed(1)}%)...`}
                      startIcon={!password ? <LockClose /> : <LockOpen />}
                      variant="contained"
                      color={!password ? 'warning' : 'primary'}
                      sx={(theme) => ({
                        mt: 1,
                        pl: 4,
                        pr: 4,
                        width: 200,
                        [theme.breakpoints.down('sm')]: {
                          width: '100%',
                        },
                      })}
                      onClick={async () => {
                        if (!password) {
                          await openPassword()
                          return
                        }
                        handlePasswordDownload(password)
                      }}
                    >
                      {t('common', 'download')}
                    </Button>
                  )}
                </PasswordSwitch>
              )}
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{ mb: 2 }}
              className="flex justify-center"
              dangerouslySetInnerHTML={{ __html: qr.current }}
            />
            {!payload.is_encrypted && (
              <>
                <Typography variant="body2" color="textDisabled">
                  {t('fileDialog', 'hashLabel')}{' '}
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
              </>
            )}
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
