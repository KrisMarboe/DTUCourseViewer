from bs4 import BeautifulSoup
import requests
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from webdriver_manager.firefox import GeckoDriverManager
import time
import os
import pickle
import pandas as pd
from termcolor import colored

def parse_text(raw_text):
    text = re.sub(r'[\t\n\r]', '', raw_text)
    return text

def parse_attribute(name, raw_info):
    if name == 'Course type' or name == 'Kursustype':
        info = '_'.join([section.text for section in raw_info.find_all('div') if not section.get('id')])
        for line in raw_info.find('div', {'id':'studiebox'}).find_all('span'):
            if not line.get('class'):
                info = info + '_' + line.text
    elif name == 'Recommended prerequisites' or name == 'Anbefalede forudsætninger':
        info = ','.join([link.text for link in raw_info.find_all('a')])
        #if not info:
        #    print(colored('PROBLEM WITH RECOMMENDED COURSES', 'red'))
        info = info + ', ' + ','.join(raw_info.findAll(string=True, recursive=False))
    elif name == 'Responsible' or name == 'Kursusansvarlig':
        info = raw_info.find('a').text
    else:
        info = raw_info.text
    return parse_text(info)

attributes = {
    'dansk': [
        'Kursus id', 'Engelsk titel', 'Dansk titel', 'Point( ECTS )', 'Kursustype',
        'Undervisningens placering', 'Anbefalede forudsætninger', 'Kursusansvarlig', 'Institut', 'Link'
    ],
    'english': [
        'Course id', 'English title', 'Danish title', 'Point( ECTS )', 'Course type',
        'Location', 'Recommended prerequisites', 'Responsible', 'Department', 'Link'
    ]
}
language = 'english'  # 'dansk' or 'english'

df = pd.DataFrame(None, columns=attributes[language])

driver = webdriver.Firefox(executable_path=GeckoDriverManager().install())

# Downloading DTU courses
baseurl = 'https://kurser.dtu.dk'
#url = 'https://kurser.dtu.dk/course/01005'
url = 'https://kurser.dtu.dk/search?CourseCode=&SearchKeyword=&Department=1&Department=10&Department=12&Department=13&Department=22&Department=23&Department=24&Department=25&Department=26&Department=27&Department=28&Department=29&Department=30&Department=33&Department=34&Department=36&Department=38&Department=41&Department=42&Department=46&Department=47&Department=59&Department=IHK&Department=83&CourseType=&TeachingLanguage=&Volume=2022%2F2023'
s = requests.Session()
s.get(baseurl)

# # change language
# # cookie_obj = requests.cookies.create_cookie(domain="kurser.dtu.dk", name="{DTUCoursesPublicLanguage}", value="en-GB")
# # s.cookies.set_cookie(cookie_obj)

response = s.get(url)
soup = BeautifulSoup(response.text, "html.parser")

# Access individual course site
for course_link in soup.find('table', {'class': 'table'}).find_all('a'):

    found_attributes = 3

    course_data = {k: None for k in attributes[language]}

    print(colored('=' * 50, 'blue'))
    print(colored(f'Scraping course: {course_link.text}\n', 'blue'))
    # course_response = s.get(baseurl + course_link.get('href'))
    # course_soup = BeautifulSoup(course_response.text, 'html.parser')

    course_data['Link'] = baseurl + course_link.get('href')
    driver.get(baseurl + course_link.get('href'))

    time.sleep(0.5)
    language_link = driver.find_element(By.TAG_NAME, "a")
    if language_link.text.lower() == language:
        language_link.click()
        time.sleep(0.5)

    course_soup = BeautifulSoup(driver.page_source, 'html.parser')

    if language == 'english':
        # English title
        raw_eng_title = course_soup.find('h2').text
        course_data['Course id'] = raw_eng_title[1:6]
        course_data['English title'] = raw_eng_title[7:]
        print('ID:', course_data['Course id'])
        print('Title:', course_data['English title'], '\n')
    else:
        # Dansk titel
        raw_eng_title = parse_text(course_soup.find('h2').text)
        course_data['Kursus id'] = raw_eng_title[:5]
        course_data['Dansk titel'] = raw_eng_title[6:]
        print('ID:', course_data['Kursus id'])
        print('Title:', course_data['Dansk titel'])

    # Gather data
    for sub_table in course_soup.find_all('table'):
        for row in sub_table.find_all('tr'):
            try:
                name, info = row.find_all('td')
                name_text = parse_text(name.text)
            except ValueError:
                continue
            if name_text in attributes[language]:
                found_attributes += 1
                course_data[name_text] = parse_attribute(name_text, info)

    df.loc[len(df)] = list(course_data.values())

    print(f'Found attributes: {found_attributes}/{len(attributes[language])}\n')

df.to_csv('Courses.csv')

driver.quit()