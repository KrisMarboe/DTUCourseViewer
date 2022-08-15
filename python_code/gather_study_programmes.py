from bs4 import BeautifulSoup
import requests
import re

def parse_text(raw_text):
    text = re.sub(r'[\t\n\r]', '', raw_text).replace('  ', '')
    return text

baseurl = 'https://www.dtu.dk'
url = 'https://www.dtu.dk/uddannelse'
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')
degree_types = soup.find_all('a', {'class': 'a-link a-link--arrow a-link--sm m-link-list__link'})

diplom_response = requests.get(baseurl + degree_types[0].get('href'))
diplom_soup = BeautifulSoup(diplom_response.text, 'html.parser')
diplom_retninger = [titel.text + ' (dip)' for titel in diplom_soup.find_all('h3')]

bachelor_response = requests.get(baseurl + degree_types[3].get('href'))
bachelor_soup = BeautifulSoup(bachelor_response.text, 'html.parser')
bachelor_retninger = [titel.text + ' (bac)' for titel in bachelor_soup.find_all('h3')]

kandidat_response = requests.get(baseurl + degree_types[6].get('href'))
kandidat_soup = BeautifulSoup(kandidat_response.text, 'html.parser')
kandidat_retninger = [parse_text(titel.text) + ' (kan)' for titel in kandidat_soup.find('div', {'class': 'o-link-list o-link-list--theme'}).find_all('a')]

retningsliste = '_'.join(diplom_retninger) + '_' + '_'.join(bachelor_retninger) + '_' + '_'.join(kandidat_retninger)

with open('study_programmes.txt', 'w') as text_file:
    text_file.write(retningsliste)