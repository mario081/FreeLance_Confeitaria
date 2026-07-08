#!/bin/bash
set -e

# Cria bancos para n8n e Evolution API
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE n8n;
    CREATE DATABASE evolution;
EOSQL

# Cria tabelas no banco da confeitaria
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE IF NOT EXISTS conversa_estado (
        numero        TEXT PRIMARY KEY,
        estado        TEXT NOT NULL DEFAULT 'aguardando_inicial',
        dados         JSONB NOT NULL DEFAULT '{}',
        disparo       TEXT NOT NULL DEFAULT 'manha',
        atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS erros_log (
        id        SERIAL PRIMARY KEY,
        numero    TEXT NOT NULL,
        erro      TEXT NOT NULL,
        dados     JSONB NOT NULL DEFAULT '{}',
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    );
EOSQL
