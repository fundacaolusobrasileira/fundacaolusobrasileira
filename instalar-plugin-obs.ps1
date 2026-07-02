# Script de instalação do OBS Background Removal Plugin v1.3.7
# Execute como Administrador clicando com botão direito > "Executar com PowerShell"

$pluginSource = "$PSScriptRoot\obs-backgroundremoval"
$pluginDest = "C:\ProgramData\obs-studio\plugins"

Write-Host "=== Instalador: OBS Background Removal Plugin v1.3.7 ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se a pasta do plugin existe
if (-not (Test-Path $pluginSource)) {
    Write-Host "ERRO: Pasta 'obs-backgroundremoval' não encontrada ao lado do script." -ForegroundColor Red
    Write-Host "Verifique se a pasta esta no mesmo local que este script." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Criar pasta de destino se não existir
if (-not (Test-Path $pluginDest)) {
    Write-Host "Criando pasta de plugins: $pluginDest" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $pluginDest -Force | Out-Null
}

# Copiar o plugin
Write-Host "Instalando plugin em: $pluginDest" -ForegroundColor Green
Copy-Item -Path $pluginSource -Destination $pluginDest -Recurse -Force

Write-Host ""
Write-Host "Plugin instalado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. Abra (ou reinicie) o OBS Studio"
Write-Host "  2. Va em Ferramentas > Filtros de efeito em uma fonte de video"
Write-Host "  3. Clique em '+' e procure por 'Background Removal'"
Write-Host ""
Read-Host "Pressione Enter para fechar"
