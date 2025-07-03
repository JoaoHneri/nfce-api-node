-- Queries de INSERT para dados de teste
-- Baseado nos dados fornecidos para YELLOWSTONE MINERACAO CRIATIVA LTDA

-- 1. INSERT na tabela MEMBER
INSERT INTO member (
    cnpj, 
    x_name, 
    x_fant, 
    ie, 
    crt, 
    street, 
    number, 
    neighborhood, 
    city_code, 
    city, 
    state, 
    zip_code, 
    c_pais, 
    x_pais, 
    phone, 
    created_at, 
    updated_at
) VALUES (
    '60142655000126',                           -- cnpj
    'YELLOWSTONE MINERACAO CRIATIVA LTDA',      -- x_name
    'YELLOWSTONE',                              -- x_fant
    '153453205111',                             -- ie
    '1',                                        -- crt (1 = Simples Nacional)
    'AV GUILHERME CAMPOS',                      -- street
    '500',                                      -- number
    'JARDIM SANTA GENERRA',                     -- neighborhood
    '3550308',                                  -- city_code
    'SÃO PAULO',                                -- city
    'SP',                                       -- state
    '13087901',                                 -- zip_code
    '1058',                                     -- c_pais (Brasil)
    'BRASIL',                                   -- x_pais
    '11999999999',                              -- phone
    NOW(),                                      -- created_at
    NOW()                                       -- updated_at
);

-- 2. INSERT na tabela CERTIFICATES
-- Primeiro, obter o ID da empresa inserida
SET @member_id = (SELECT id FROM member WHERE cnpj = '60142655000126');

INSERT INTO certificates (
    member_id,
    pfx_path,
    password,
    csc,
    csc_id,
    environment,
    uf,
    is_active,
    created_at,
    updated_at
) VALUES (
    @member_id,                                                                                      -- member_id
    'C:/Users/joaoh/Desktop/Arquivos PASS/YELLOWSTONE MINERACAO CRIATIVA LTDA_60142655000126.pfx',  -- pfx_path
    'deport',                                                                                        -- password
    '2514ec59-2e6c-425c-9dc8-907bd0047162',                                                         -- csc
    '1',                                                                                             -- csc_id
    '2',                                                                                             -- environment (2 = Homologação)
    'SP',                                                                                            -- uf
    1,                                                                                               -- is_active
    NOW(),                                                                                           -- created_at
    NOW()                                                                                            -- updated_at
);

-- 3. Verificar se os dados foram inseridos corretamente
SELECT 
    m.id,
    m.cnpj,
    m.x_name,
    m.x_fant,
    m.state,
    c.id as certificate_id,
    c.pfx_path,
    c.environment,
    c.uf,
    c.is_active
FROM member m
LEFT JOIN certificates c ON m.id = c.member_id
WHERE m.cnpj = '60142655000126';

-- 4. Query alternativa caso queira inserir o certificado com ID específico
-- (Use esta se a primeira não funcionar devido a problemas com variáveis)
/*
INSERT INTO certificates (
    member_id,
    pfx_path,
    password,
    csc,
    csc_id,
    environment,
    uf,
    is_active,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM member WHERE cnpj = '60142655000126'),
    'C:/Users/joaoh/Desktop/Arquivos PASS/YELLOWSTONE MINERACAO CRIATIVA LTDA_60142655000126.pfx',
    'deport',
    '2514ec59-2e6c-425c-9dc8-907bd0047162',
    '1',
    '2',
    'SP',
    1,
    NOW(),
    NOW()
);
*/
