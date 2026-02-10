import fs from 'fs'
import path from 'path'

export default function jsnemp() {
  return {
    name: 'jsnemp-plugin',

    config() {
      return {
        publicDir: 'public'
      }
    },

    closeBundle() {
      const projectRoot = process.cwd()
      const distAssets = path.join(projectRoot, 'dist/assets')

      const userAssets = path.join(projectRoot, 'src/assets')
      const frameworkAssets = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        '../../packages/core/assets'
      )

      fs.mkdirSync(distAssets, { recursive: true })

      copy(userAssets, distAssets)
      copy(frameworkAssets, distAssets)
    }
  }
}

function copy(from, to) {
  if (!fs.existsSync(from)) return

  for (const file of fs.readdirSync(from)) {
    const src = path.join(from, file)
    const dest = path.join(to, file)

    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true })
      copy(src, dest)
    } else {
      fs.copyFileSync(src, dest)
    }
  }
}
