import * as React from 'preact/compat'
import { ComponentChildren } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import { observer } from 'mobx-react-lite'
import IconButton from '@mui/material/IconButton'
import LockClose from '@mui/icons-material/Lock'
import LockOpen from '@mui/icons-material/LockOpen'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { useDialogs, DialogProps } from '@toolpad/core/useDialogs'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import OutlinedInput from '@mui/material/OutlinedInput'
import FormHelperText from '@mui/material/FormHelperText'

import { useTranslation } from '../../../i18n'

interface PasswordSwitchProps {
  value?: string
  onChange?: (password: string) => void
  actionable?: boolean
  children?: (open: { (): Promise<void> }) => ComponentChildren
}

const PasswordDialog = observer(
  ({
    open,
    onClose,
    payload,
  }: DialogProps<{ password: string; showClear: boolean }, string | null>) => {
    const { t } = useTranslation()
    const { password, showClear = true } = payload
    const [result, setResult] = useState(password)
    const [show, setShow] = useState(false)
    const el = useRef<HTMLDivElement>(null)

    const handleClickShowPassword = () => setShow((show) => !show)

    const handleMouseDownPassword = (
      event: React.MouseEvent<HTMLButtonElement>,
    ) => {
      event.preventDefault()
    }

    const handleMouseUpPassword = (
      event: React.MouseEvent<HTMLButtonElement>,
    ) => {
      event.preventDefault()
    }

    useEffect(() => {
      if (!el.current) return
      const input = el.current.querySelector('input')
      if (input) {
        input.focus()
      }
    }, [])

    return (
      <Dialog open={open} onClose={() => onClose(null)}>
        <DialogTitle>{t('password', 'sharePassword')}</DialogTitle>
        <DialogContent>
          <OutlinedInput
            ref={el}
            placeholder={t('password', 'enterPassword')}
            type={show ? 'text' : 'password'}
            endAdornment={
              <InputAdornment position="end">
                <IconButton
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                  onMouseUp={handleMouseUpPassword}
                  edge="end"
                >
                  {show ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            }
            slotProps={{
              input: {
                // @ts-expect-error data-attr
                'data-bwignore': 'off',
                autocomplete: 'off',
                'data-1p-ignore': true,
                'data-lpignore': true,
                'data-protonpass-ignore': true,
              },
            }}
            fullWidth
            value={result}
            onChange={(event) => setResult(event.currentTarget.value)}
          />
          <FormHelperText sx={{ mt: 2 }}>
            {t('password', 'encryptedNotice')}
          </FormHelperText>
        </DialogContent>
        <DialogActions
          sx={{
            p: 4,
            pt: 0,
          }}
        >
          {showClear && (
            <Button
              className="flex-1"
              variant="outlined"
              color="error"
              onClick={() => onClose('')}
            >
              {t('password', 'clearPassword')}
            </Button>
          )}
          <Button
            className="flex-1"
            variant="contained"
            onClick={() => onClose(result)}
          >
            {t('common', 'confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    )
  },
)

export function PasswordSwitch(props: PasswordSwitchProps) {
  const dialogs = useDialogs()

  const { value, onChange, actionable } = props
  const [password, updatePassword] = useState(value ?? '')

  const handleClick = async () => {
    const result = await dialogs.open(PasswordDialog, {
      password,
      showClear: !actionable,
    })
    updatePassword(result || '')
    if (onChange) {
      onChange(result || '')
    }
  }

  if (props.children) {
    return props.children(handleClick)
  }

  return (
    <IconButton onClick={handleClick}>
      {password || actionable ? (
        <LockClose color="primary" />
      ) : (
        <LockOpen color="disabled" />
      )}
    </IconButton>
  )
}
