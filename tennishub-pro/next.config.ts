import type { NextConfig } from 'next'

// O caminho do projeto (sob OneDrive Business + worktree) é longo demais para o
// MAX_PATH do Windows. Redirecionamos a saída de build (.next) para um caminho
// curto fora da árvore. Pode ser sobrescrito via THP_DIST_DIR.
const nextConfig: NextConfig = {}

export default nextConfig
