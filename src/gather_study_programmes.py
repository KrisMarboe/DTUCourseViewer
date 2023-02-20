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
diplom_programmes = [titel.text + ' (Dip)' for titel in diplom_soup.find_all('h3')]

bachelor_response = requests.get(baseurl + degree_types[3].get('href'))
bachelor_soup = BeautifulSoup(bachelor_response.text, 'html.parser')
bachelor_programmes = [titel.text + ' (BSc)' for titel in bachelor_soup.find_all('h3')]

danish_master_response = requests.get(baseurl + degree_types[6].get('href'))
danish_master_soup = BeautifulSoup(danish_master_response.text, 'html.parser')
danish_master_programmes = [parse_text(titel.text) + ' (MSc)' for titel in danish_master_soup.find('div', {'class': 'o-link-list o-link-list--theme'}).find_all('a')]

danish_programmes = '_'.join(diplom_programmes) + '_' + '_'.join(bachelor_programmes) + '_' + '_'.join(danish_master_programmes)

# For english master programmes
english_master_response = requests.get("https://www.dtu.dk/english/education/graduate/msc-programmes")
english_master_soup = BeautifulSoup(english_master_response.text, 'html.parser')
english_master_programmes = [titel.text + ' (MSc)' for titel in english_master_soup.find_all('h3')]

mixed_programmes = '_'.join(diplom_programmes) + '_' + '_'.join(bachelor_programmes) + '_' + '_'.join(english_master_programmes)

with open('danish_study_programmes.txt', 'w') as text_file:
    text_file.write(danish_programmes)

with open('mixed_study_programmes.txt', 'w') as text_file:
    text_file.write(mixed_programmes)