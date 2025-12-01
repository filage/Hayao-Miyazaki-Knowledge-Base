-- Schema for Hayao Miyazaki knowledge base

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS works (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_ru TEXT NOT NULL,
    title_en TEXT,
    release_year INTEGER,
    type TEXT CHECK (type IN ('feature', 'short', 'manga', 'series', 'other')),
    synopsis TEXT,
    poster_url TEXT,
    trailer_url TEXT,
    runtime_minutes INTEGER,
    rating NUMERIC(3,1),
    age_rating TEXT,
    budget BIGINT,
    box_office BIGINT,
    world_premiere DATE
);

CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name_ru TEXT NOT NULL,
    full_name_en TEXT,
    roles JSONB,
    biography TEXT,
    birth_date DATE,
    country TEXT,
    photo_url TEXT
);

CREATE TABLE IF NOT EXISTS characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ru TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    image_url TEXT,
    first_appearance_year INTEGER
);

CREATE TABLE IF NOT EXISTS genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    title_ru TEXT NOT NULL,
    title_en TEXT,
    description TEXT,
    category TEXT
);

CREATE TABLE IF NOT EXISTS awards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT,
    presented_by TEXT,
    year_started INTEGER,
    location TEXT,
    description TEXT,
    prestige_level INTEGER
);

CREATE TABLE IF NOT EXISTS work_persons (
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    PRIMARY KEY (work_id, person_id, role)
);

CREATE TABLE IF NOT EXISTS work_characters (
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    importance TEXT,
    PRIMARY KEY (work_id, character_id)
);

CREATE TABLE IF NOT EXISTS work_genres (
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    genre_id UUID REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (work_id, genre_id)
);

CREATE TABLE IF NOT EXISTS work_awards (
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    award_id UUID REFERENCES awards(id) ON DELETE CASCADE,
    award_year INTEGER,
    result TEXT CHECK (result IN ('winner', 'nominee', 'special_mention')),
    PRIMARY KEY (work_id, award_id, award_year)
);

-- Пользователи (для авторизации и списков)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'))
);

-- Списки фильмов пользователей (в планах, просмотрено, избранное)
CREATE TABLE IF NOT EXISTS user_film_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    list_type TEXT NOT NULL CHECK (list_type IN ('watchlist', 'watched', 'favorite')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    UNIQUE (user_id, work_id, list_type)
);

-- Сессии пользователей
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Комментарии к фильмам
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_id UUID REFERENCES works(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_work ON comments(work_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_works_release_year ON works(release_year);
CREATE INDEX IF NOT EXISTS idx_persons_full_name_ru ON persons(full_name_ru);
CREATE INDEX IF NOT EXISTS idx_characters_name_ru ON characters(name_ru);
CREATE INDEX IF NOT EXISTS idx_genres_category ON genres(category);
CREATE INDEX IF NOT EXISTS idx_awards_name ON awards(name);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_film_lists_user ON user_film_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_film_lists_work ON user_film_lists(work_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
