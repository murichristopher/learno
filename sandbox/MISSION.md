# Missão — Sandbox

> **Este arquivo é fixture.** Não é uma missão de estudo real. Existe para que o
> motor tenha um `MISSION.md` válido para ler enquanto se desenvolve o próprio
> motor. O assunto é deliberadamente falso.

## O que quero aprender

**Widgets Distribuídos** — um domínio inventado, usado só para exercitar o
formato de lição de ponta a ponta.

## Por quê

Para que mudanças de layout, de estilo e de formato de lição possam ser testadas
contra conteúdo que cobre todos os componentes, sem tocar em nenhum workspace de
estudo real e sem gastar chamada de modelo.

## Onde estou hoje

Nível intermediário fictício: os conceitos `sandbox_widget_sharding`,
`sandbox_widget_replication` e `sandbox_widget_backpressure` já constam como dominados
em `fixtures/seed.json`; `sandbox_idempotency` continua em aberto, de propósito,
para que o estado "não dominado" apareça no dashboard.

## Como quero aprender

Igual a um workspace real — lição, teach-back, validação, revisão espaçada —
porque o objetivo do sandbox é justamente reproduzir o fluxo completo.

## Restrições

Nenhuma. Nada aqui é persistido: o store em memória é recriado a cada restart.
