#!/usr/bin/env python3
"""Create the Lelap products, pages, blog, articles and subscription policy via the Admin GraphQL API.

Idempotent: anything that already exists (matched by handle) is updated or skipped.

Requirements: a custom-app Admin API access token with scopes
  write_products, read_products, write_content, read_content, write_publications, read_publications,
  write_legal_policies, read_legal_policies
exported as SHOPIFY_ADMIN_TOKEN. Optional: SHOPIFY_STORE (default lelap-shop.myshopify.com).

Usage:
  python3 scripts/setup_store.py            # create / update everything
  python3 scripts/setup_store.py --dry-run  # only print what would happen
  python3 scripts/setup_store.py --publish-articles  # also publish the Sleep Library articles

Articles (import/articles.json) are created hidden by default so a doctor can review them first;
publish them in Admin > Online Store > Blog posts, or rerun with --publish-articles.
"""
import csv, json, os, sys, urllib.request, urllib.error

STORE = os.environ.get('SHOPIFY_STORE', 'lelap-shop.myshopify.com')
TOKEN = os.environ.get('SHOPIFY_ADMIN_TOKEN')
API = os.environ.get('SHOPIFY_API_VERSION', '2025-10')
DRY = '--dry-run' in sys.argv
PUBLISH_ARTICLES = '--publish-articles' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Product photos exported from Figma, served from the live theme's CDN.
THEME_ASSET = 'https://{store}/cdn/shop/t/{theme}/assets/{file}'

PAGES = [
    ('About', 'about', 'about'),
    ('Science & doctors', 'science-doctors', 'science'),
    ('Help', 'help', 'help'),
    ('Sleep quiz', 'sleep-quiz', 'quiz'),
    ('Terms of service', 'terms-of-service', 'terms'),
    ('Telehealth consent', 'telehealth-consent', 'telehealth'),
    ('Refund request', 'refund-request', 'refund'),
    ('Care team', 'care-team', 'account-care-team'),
    ('Profile & health', 'profile-health', 'account-profile'),
]
BLOGS = [('Sleep library', 'sleep-library')]


def gql(query, variables=None):
    if DRY and query.lstrip().startswith('mutation'):
        print('  [dry-run] would run mutation with', json.dumps(variables)[:200])
        return {}
    req = urllib.request.Request(
        f'https://{STORE}/admin/api/{API}/graphql.json',
        data=json.dumps({'query': query, 'variables': variables or {}}).encode(),
        headers={'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            out = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f'HTTP {e.code}: {e.read().decode()[:500]}')
    if out.get('errors'):
        sys.exit('GraphQL errors: ' + json.dumps(out['errors'])[:800])
    return out['data']


def user_errors(payload, what):
    errs = (payload or {}).get('userErrors') or []
    if errs:
        print(f'  ! {what}:', '; '.join(e.get('message', '') for e in errs))
    return not errs


def main_theme_id():
    d = gql('{ themes(first: 20, roles: [MAIN]) { nodes { id name } } }')
    node = d['themes']['nodes'][0]
    return node['id'].split('/')[-1], node['name']


def online_store_publication():
    d = gql('{ publications(first: 20) { nodes { id name } } }')
    for p in d['publications']['nodes']:
        if p['name'] == 'Online Store':
            return p['id']
    return None


def setup_products(theme_id, publication_id):
    rows = list(csv.DictReader(open(os.path.join(ROOT, 'import', 'products.csv'))))
    for row in rows:
        handle = row['Handle']
        image = THEME_ASSET.format(store=STORE, theme=theme_id, file=f'pouch-{handle}.jpg')
        existing = gql('query($q: String!) { products(first: 1, query: $q) { nodes { id handle } } }',
                       {'q': f'handle:{handle}'})['products']['nodes']
        product_input = {
            'title': row['Title'], 'handle': handle, 'descriptionHtml': row['Body (HTML)'],
            'vendor': row['Vendor'], 'productType': row['Type'],
            'tags': [t.strip() for t in row['Tags'].split(',') if t.strip()],
            'status': 'ACTIVE',
            'seo': {'title': row['SEO Title'], 'description': row['SEO Description']},
            'productOptions': [{'name': 'Title', 'values': [{'name': 'Default Title'}]}],
            'variants': [{
                'optionValues': [{'optionName': 'Title', 'name': 'Default Title'}],
                'price': row['Variant Price'], 'sku': row['Variant SKU'],
                'inventoryPolicy': 'CONTINUE', 'taxable': True,
            }],
        }
        if not existing:
            product_input['files'] = [{'originalSource': image, 'contentType': 'IMAGE', 'alt': row['Title']}]
        else:
            product_input['id'] = existing[0]['id']
        print(('Update' if existing else 'Create'), 'product', handle)
        d = gql('''mutation($input: ProductSetInput!) {
            productSet(synchronous: true, input: $input) { product { id handle } userErrors { field message } } }''',
                {'input': product_input})
        payload = d.get('productSet') if d else None
        if payload and user_errors(payload, handle) and publication_id:
            pid = payload['product']['id']
            p = gql('''mutation($id: ID!, $pub: ID!) { publishablePublish(id: $id, input: [{publicationId: $pub}]) {
                userErrors { field message } } }''', {'id': pid, 'pub': publication_id})
            user_errors(p.get('publishablePublish') if p else None, f'publish {handle}')


def setup_pages():
    for title, handle, suffix in PAGES:
        found = gql('query($q: String!) { pages(first: 1, query: $q) { nodes { id handle templateSuffix } } }',
                    {'q': f'handle:{handle}'})['pages']['nodes']
        if found:
            node = found[0]
            if node.get('templateSuffix') != suffix:
                print('Set template', handle, '->', f'page.{suffix}')
                d = gql('''mutation($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) {
                    userErrors { field message } } }''', {'id': node['id'], 'page': {'templateSuffix': suffix, 'isPublished': True}})
                user_errors(d.get('pageUpdate') if d else None, handle)
            else:
                print('Page exists', handle)
            continue
        print('Create page', handle, f'(page.{suffix})')
        d = gql('''mutation($page: PageCreateInput!) { pageCreate(page: $page) { page { id handle } userErrors { field message } } }''',
                {'page': {'title': title, 'handle': handle, 'templateSuffix': suffix, 'isPublished': True, 'body': ''}})
        user_errors(d.get('pageCreate') if d else None, handle)


def setup_blogs():
    ids = {}
    for title, handle in BLOGS:
        found = gql('query($q: String!) { blogs(first: 1, query: $q) { nodes { id handle } } }',
                    {'q': f'handle:{handle}'})['blogs']['nodes']
        if found:
            print('Blog exists', handle)
            ids[handle] = found[0]['id']
            continue
        print('Create blog', handle)
        d = gql('''mutation($blog: BlogCreateInput!) { blogCreate(blog: $blog) { blog { id handle } userErrors { field message } } }''',
                {'blog': {'title': title, 'handle': handle}})
        user_errors(d.get('blogCreate') if d else None, handle)
        if d and d['blogCreate']['blog']:
            ids[handle] = d['blogCreate']['blog']['id']
    return ids


def setup_articles(blog_id, theme_id):
    articles = json.load(open(os.path.join(ROOT, 'import', 'articles.json'), encoding='utf-8'))
    for a in articles:
        found = gql('query($q: String!) { articles(first: 1, query: $q) { nodes { id handle } } }',
                    {'q': f"handle:{a['handle']}"})['articles']['nodes']
        if found:
            if PUBLISH_ARTICLES:
                print('Publish article', a['handle'])
                d = gql('''mutation($id: ID!, $article: ArticleUpdateInput!) { articleUpdate(id: $id, article: $article) {
                    article { id } userErrors { field message } } }''', {'id': found[0]['id'], 'article': {'isPublished': True}})
                user_errors(d.get('articleUpdate') if d else None, a['handle'])
            else:
                print('Article exists', a['handle'])
            continue
        print('Create article', a['handle'], '(published)' if PUBLISH_ARTICLES else '(hidden)')
        image = THEME_ASSET.format(store=STORE, theme=theme_id.split('/')[-1], file=a['image'])
        d = gql('''mutation($article: ArticleCreateInput!) { articleCreate(article: $article) {
            article { id handle } userErrors { field message } } }''', {'article': {
                'blogId': blog_id, 'title': a['title'], 'handle': a['handle'], 'body': a['body'],
                'summary': a['summary'], 'tags': [a['tag']], 'author': {'name': 'Lelap care team'},
                'image': {'url': image, 'altText': a['title']}, 'isPublished': PUBLISH_ARTICLES}})
        user_errors(d.get('articleCreate') if d else None, a['handle'])


def setup_policies():
    body = open(os.path.join(ROOT, 'import', 'subscription-policy.html'), encoding='utf-8').read()
    current = gql('{ shop { shopPolicies { type body } } }')['shop']['shopPolicies']
    if any(p['type'] == 'SUBSCRIPTION_POLICY' and p['body'].strip() for p in current):
        print('Subscription policy exists')
        return
    print('Create subscription policy')
    d = gql('''mutation($p: ShopPolicyInput!) { shopPolicyUpdate(shopPolicy: $p) {
        shopPolicy { id } userErrors { field message } } }''', {'p': {'type': 'SUBSCRIPTION_POLICY', 'body': body}})
    user_errors(d.get('shopPolicyUpdate') if d else None, 'subscription policy')


if __name__ == '__main__':
    if not TOKEN:
        sys.exit('Set SHOPIFY_ADMIN_TOKEN (Admin API access token of a custom app) first.')
    shop = gql('{ shop { name currencyCode } }')['shop']
    print(f"Store: {shop['name']} ({STORE}), currency {shop['currencyCode']}")
    theme_id, theme_name = main_theme_id()
    print('Live theme:', theme_name, theme_id)
    setup_products(theme_id, online_store_publication())
    setup_pages()
    blogs = setup_blogs()
    if blogs.get('sleep-library'):
        setup_articles(blogs['sleep-library'], theme_id)
    setup_policies()
    print('Done.')
