import { useEffect, useState } from 'preact/hooks'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Version } from '../../src/version'

export function Footer() {
  const [version, setVersion] = useState<Version | null>(null)

  useEffect(() => {
    fetch('/version')
      .then((res) => res.json())
      .then((data) => setVersion(data))
      .catch(console.error)
  }, [])

  if (!version) return null

  const formattedDate = new Date(version.buildTime).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/\//g, '-')

  return (
    <Box
      component="footer"
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 1,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        Build Time: {formattedDate} (Cloudflare build 版本號)
      </Typography>
    </Box>
  )
} 