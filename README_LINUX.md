# Devices Tycoon - launcher Linux

Este diretório contém o jogo original em `www/` e um launcher local para Linux.
O launcher abre o jogo como aplicativo em Brave/Chromium, sem depender do Android
ou do Cordova nativo.

## Executar

```bash
cd /home/gullin/Downloads/device-linux
./run-linux.sh
```

Também é possível abrir `Devices Tycoon.desktop` pelo gerenciador de arquivos.

Se houver problema gráfico, tente nesta ordem:

```bash
./run-linux-angle-nosandbox.sh
./run-linux-swiftshader.sh
```

Os saves ficam no perfil persistente em
`~/.local/share/devices-tycoon-linux/chromium-profile`. Para escolher outro local,
use `PROFILE_DIR=/caminho ./run-linux.sh`.

## Diagnóstico

O console do jogo é encaminhado para `linux_page.log`. O servidor aceita apenas
conexões locais (`127.0.0.1`) e é encerrado junto com a janela do jogo.

O arquivo Android original `www/index.html`, o `www/cordova.js` e o
`www/scripts/main.js` permanecem intactos. A rota `scripts/main-linux.js` é gerada
em memória pelo servidor, alterando somente o tipo de exportação de `cordova`
para `html5` e ativando o backend de diálogos Linux.

## Menu de cheats

Use o botão `DT CHEATS`, no canto superior direito do jogo. O menu inclui:

- dinheiro e research coins infinitos;
- sandbox liberado e selecionado desde a criação da empresa;
- ativação dos recursos avançados de câmera, tela, biometria, áudio e conexão;
- edição ao vivo dos parâmetros internos de smartphones e CPUs;
- opção de fixar cada valor para o jogo não restaurá-lo;
- editor de células dos arrays de smartphones e CPUs criados;
- navegador de todas as variáveis globais do runtime.

O `Modo VIP` libera localmente as licenças e funções premium disponíveis no
runtime offline, desativa bloqueios de anúncios e abre flags premium. Ele não
falsifica recibos nem altera compras da Google Play/App Store.

Os diálogos de nome da empresa, nome do jogador e outros prompts que eram
fornecidos pelo Cordova agora usam o teclado nativo do navegador Linux.

As configurações do menu são guardadas no perfil local. No editor de arrays,
altere somente células conhecidas: valores incompatíveis podem invalidar aquele
save. O jogo Android original continua sem modificações.
