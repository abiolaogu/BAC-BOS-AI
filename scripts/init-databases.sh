#!/bin/bash
set -e

# Initialize multiple PostgreSQL databases for NEXUS Platform
# This script runs during PostgreSQL container initialization

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create databases for all services
    CREATE DATABASE writer;
    CREATE DATABASE sheets;
    CREATE DATABASE slides;
    CREATE DATABASE drive;
    CREATE DATABASE mail;
    CREATE DATABASE crm;
    CREATE DATABASE erp;
    CREATE DATABASE ecommerce;
    CREATE DATABASE hr;
    CREATE DATABASE finance;
    CREATE DATABASE idaas;
    CREATE DATABASE dbaas;
    CREATE DATABASE vas;
    CREATE DATABASE voice;
    CREATE DATABASE contact_center;
    CREATE DATABASE devops;
    CREATE DATABASE api_manager;
    CREATE DATABASE webhosting;
    CREATE DATABASE ipaas;
    CREATE DATABASE bpa;
    CREATE DATABASE designer;
    CREATE DATABASE ai_agents;
    CREATE DATABASE mmp;
    CREATE DATABASE analytics;

    -- Grant permissions
    GRANT ALL PRIVILEGES ON DATABASE writer TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE sheets TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE slides TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE drive TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE mail TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE crm TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE erp TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE ecommerce TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE hr TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE finance TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE idaas TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE dbaas TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE vas TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE voice TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE contact_center TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE devops TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE api_manager TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE webhosting TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE ipaas TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE bpa TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE designer TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE ai_agents TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE mmp TO nexus;
    GRANT ALL PRIVILEGES ON DATABASE analytics TO nexus;

    -- Create extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "btree_gin";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";

    \echo 'All databases created successfully!'
EOSQL
