# Devices Tycoon Linux Cheat Lab

Adaptação local do **Devices Tycoon** para execução em Linux por meio de um
navegador Chromium, com um painel de depuração e edição chamado **DT Cheats**.

O projeto preserva o runtime Android/Cordova original em `www/` e gera, durante
a execução, uma entrada compatível com HTML5. Nenhum APK é instalado e o
servidor aceita conexões somente em `127.0.0.1`.

## Estado do projeto

Funcional para uso local no Linux e validado com Brave/Chromium. O launcher,
servidor local, diálogos via navegador e painel DT Cheats foram testados com o
runtime Construct conectado.

Alguns controles são experimentais. Valores estendidos, como CPU/GPU em
11.000 MHz e RAM do sistema em 512 GB, mantêm internamente o maior índice
nativo válido e substituem a especificação exibida. Isso evita acessar posições
inexistentes das tabelas originais. Portanto, esses valores não equivalem a
novos níveis nativos de balanceamento do jogo.

## Recursos

- launcher Linux com perfil e saves persistentes;
- modos gráficos ANGLE, ANGLE sem sandbox de GPU e SwiftShader;
- backend de diálogos compatível com teclado e mouse;
- dinheiro e pontos de pesquisa infinitos;
- sandbox e recursos premium locais;
- `Unlock All` para tecnologias disponíveis no runtime;
- multiplicador de atualização do sistema operacional entre 1x e 200x;
- edição ao vivo e fixação de variáveis globais;
- editor avançado de smartphone;
- catálogo nativo e editor completo de `MyCPU`;
- clock estendido de CPU/GPU até 11.000 MHz;
- RAM estendida até 512 GB;
- editor completo dos parâmetros `MyGPU`;
- seleção nativa de VRAM até 512 GB, memória, bandwidth, shaders, transistores,
  refrigeração e peças visuais de GPU;
- editor de arrays de smartphones, CPUs, GPUs e seus registros salvos.

## Requisitos

- Linux com Bash;
- Python 3.10 ou mais recente;
- `curl`;
- Brave, Chromium ou Google Chrome;
- suporte gráfico WebGL 2, ou SwiftShader como fallback.

No Debian/Ubuntu, um ambiente mínimo pode ser instalado com:

```bash
sudo apt install python3 curl chromium
```

## Como executar

Clone o repositório e entre no diretório:

```bash
git clone https://github.com/pescadordegoiaba/devices-tycoon-linux-cheat-lab.git
cd devices-tycoon-linux-cheat-lab
```

Execute o launcher principal:

```bash
./run-linux.sh
```

O script procura automaticamente por `brave`, `brave-browser`, `chromium`,
`google-chrome-stable` ou `google-chrome`.

Para escolher o navegador manualmente:

```bash
BROWSER_CMD=/caminho/do/chromium ./run-linux.sh
```

## Solução de problemas gráficos

Tente os launchers nesta ordem:

```bash
./run-linux-angle-nosandbox.sh
./run-linux-swiftshader.sh
```

Os mesmos modos podem ser selecionados diretamente:

```bash
GPU_MODE=angle ./run-linux.sh
GPU_MODE=nosandbox ./run-linux.sh
GPU_MODE=swiftshader ./run-linux.sh
```

Use outra porta quando `8094` estiver ocupada:

```bash
PORT=8095 ./run-linux.sh
```

## Saves e dados locais

Por padrão, o perfil do navegador e os saves ficam em:

```text
~/.local/share/devices-tycoon-linux/chromium-profile
```

Para usar outro perfil:

```bash
PROFILE_DIR=/caminho/do/perfil ./run-linux.sh
```

Faça backup desse diretório antes de editar arrays. Uma célula com tipo ou
índice incompatível pode invalidar o save associado.

## DT Cheats

Abra o jogo e clique em **DT CHEATS**, no canto superior direito.

### Cheats e sistema operacional

- dinheiro, pesquisa, sandbox e VIP local;
- desbloqueio das tecnologias encontradas no runtime;
- multiplicador de ganho das atualizações de SO entre 1x e 200x.

### CPU e RAM

O catálogo nativo usa índices seguros para clock, núcleos, litografia, cache,
RAM, temperatura e largura de banda. A seção de modo estendido permite mostrar
até 11.000 MHz e 512 GB sem gravar `11000` ou `512` como índices internos.

O projeto original não possui campos de material físico de die, silício, cobre
ou cerâmica para CPU/GPU/RAM. O menu expõe apenas equivalentes que realmente
existem: encapsulamentos, designs, tecnologia de RAM, corpo e refrigeração da
GPU.

### GPU

A aba `GPU+` oferece os catálogos nativos e todos os campos `MyGPU`/`MyGpu`
presentes no runtime. A VRAM original chega a 512 GB; o clock de memória possui
níveis próprios que chegam além de 11 GHz. Campos desconhecidos devem ser
alterados com cuidado.

### Fixação de valores

O quadrado amarelo fixa um valor e reaplica-o periodicamente. Deixe-o desmarcado
quando quiser que o jogo volte a controlar a variável. As configurações do menu
ficam no `localStorage` do perfil escolhido.

## Estrutura

```text
.
├── run-linux.sh                    # launcher principal
├── run-linux-angle-nosandbox.sh    # fallback gráfico
├── run-linux-swiftshader.sh        # renderização por software
├── devices_linux_server.py         # servidor HTTP local e adaptação do runtime
├── Devices Tycoon.desktop          # atalho local de exemplo
└── www/
    ├── index_linux.html            # entrada Linux
    ├── devices_cheat_menu.js       # lógica do DT Cheats
    ├── devices_cheat_menu.css      # interface do painel
    ├── linux_mobile_dialog.js      # diálogos no navegador
    └── scripts/main.js             # runtime original usado como fonte
```

O servidor fornece virtualmente `scripts/main-linux.js`, trocando a exportação
Cordova por HTML5 e habilitando os diálogos Linux. O arquivo original
`www/scripts/main.js` não é reescrito no disco.

## Diagnóstico

Durante a execução, mensagens do navegador são encaminhadas para:

```text
linux_page.log
```

Para validar somente a sintaxe do menu:

```bash
node --check www/devices_cheat_menu.js
```

## Limitações

- requer um navegador baseado em Chromium;
- o atalho `.desktop` contém um caminho local de exemplo e pode precisar ser
  ajustado após o clone;
- valores estendidos preservam índices válidos, mas não criam novas tabelas de
  balanceamento no runtime Construct;
- alterações dos globais atuam principalmente no item atualmente em criação;
- produtos antigos ficam nos arrays do save e exigem edição das células certas;
- o modo VIP é offline e não cria recibos nem altera compras das lojas;
- não há editor `MyRAM` independente no jogo original.

## Aviso sobre os arquivos do jogo

Este repositório contém uma adaptação técnica de arquivos fornecidos pelo
proprietário do checkout. **Devices Tycoon**, seus assets e o runtime original
continuam pertencendo aos respectivos autores. Não há concessão automática de
licença para redistribuição pública. Mantenha o repositório privado e publique
assets somente se possuir autorização dos titulares.
