# Fechar idempotência antes de abrir consistência eventual

[Abrir a revisão R1](lessons/0002-renderer-smoke.html)

Você trocou idempotência por retry em três correções diferentes, na lição do
kitchen sink e de novo na segunda. Não é distração: é a mesma peça faltando.

Consistência eventual está agendada para depois, e vale segurar — ela se apoia
exatamente na garantia que ainda não está de pé.
