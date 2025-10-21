from playwright.sync_api import sync_playwright
import time

def run(playwright):
    time.sleep(15)
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:8080/new-dashboard")
    page.wait_for_selector('[data-testid="dashboard-filters"]')
    page.click('[data-testid="date-range-picker"]')
    page.click('button:has-text("Últimos 30 dias")')
    page.wait_for_selector('[data-testid="kpi-faturamentoBruto"]')
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
