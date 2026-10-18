"""Collega Resend (SMTP) a un progetto Supabase e carica i modelli email in italiano.

Uso:  python3 supabase/email/applica.py <id-progetto>
      es. lmxxoxrsrwmtunyqlpbh (myquicktag-prova) oppure atlhrkkfovblkhgzfeuo (myquicktag)

Servono nell'ambiente (mai nel codice):
  SUPABASE_ACCESS_TOKEN  token personale di Supabase (Management API)
  RESEND_API_KEY         chiave di Resend (basta "solo invio"): è la password SMTP

Da lanciare solo dopo che il dominio notifiche.myquicktag.it risulta "verified" su Resend,
altrimenti Resend rifiuta le email e nessuno riceve più i codici.
"""
import json
import os
import pathlib
import sys
import urllib.request

CARTELLA = pathlib.Path(__file__).parent
MITTENTE = 'no-reply@notifiche.myquicktag.it'
NOME_MITTENTE = 'myquicktag'
EMAIL_ORA = 30  # email di autenticazione all'ora per progetto (Resend gratuito: 100 al giorno in tutto)

# modello -> chiave di Supabase
MODELLI = {
    'conferma': 'confirmation',
    'recupero': 'recovery',
    'cambio-email': 'email_change',
    'accesso': 'magic_link',
}


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    progetto = sys.argv[1]
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    chiave = os.environ.get('RESEND_API_KEY')
    if not token or not chiave:
        sys.exit('Mancano SUPABASE_ACCESS_TOKEN o RESEND_API_KEY nell\'ambiente.')

    oggetti = json.loads((CARTELLA / 'oggetti.json').read_text(encoding='utf-8'))
    config = {
        'smtp_host': 'smtp.resend.com',
        'smtp_port': '465',
        'smtp_user': 'resend',
        'smtp_pass': chiave,
        'smtp_admin_email': MITTENTE,
        'smtp_sender_name': NOME_MITTENTE,
        'rate_limit_email_sent': EMAIL_ORA,
    }
    for file, chiave_sb in MODELLI.items():
        config[f'mailer_subjects_{chiave_sb}'] = oggetti[file]
        config[f'mailer_templates_{chiave_sb}_content'] = (CARTELLA / f'{file}.html').read_text(encoding='utf-8')

    richiesta = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{progetto}/config/auth',
        data=json.dumps(config).encode(),
        method='PATCH',
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    )
    with urllib.request.urlopen(richiesta) as risposta:
        d = json.load(risposta)
    print('Fatto:', progetto)
    print('  SMTP:', d.get('smtp_host'), d.get('smtp_port'), '-', d.get('smtp_sender_name'), '<' + str(d.get('smtp_admin_email')) + '>')
    print('  Limite email/ora:', d.get('rate_limit_email_sent'))
    for chiave_sb in MODELLI.values():
        print(f'  {chiave_sb}:', d.get(f'mailer_subjects_{chiave_sb}'))


if __name__ == '__main__':
    main()
