# LexImpact Legi UI

## Install and configure

```
cp example.env .env
```

edit .env

```
npm install
npm run dev
```

### DB install

See https://git.tricoteuses.fr/logiciels/legi-flat-db

or

Retrieve f_legi dump (f_legi.sql) and :

```sh
sudo su - postgres
createuser f_legi -P # ...et entrez un mot de passe de votre choix
createdb -O f_legi f_legi
psql f_legi
    create extension if not exists dblink;
    create extension if not exists ltree;
    \q
psql f_legi < f_legi.sql
exit
```
