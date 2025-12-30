let allStudents = []
let maxAmount = 0

async function fetchData() {
    try {
        const response = await fetch('https://tubneungloogpeeham.vercel.app/api/sheet-data')
        const data = await response.json()
        if (data.error) throw new Error(data.error)

        allStudents = data.students
        maxAmount = data.maxAmount

        document.getElementById('loadingState').style.display = 'none'
        renderSummaryTable(allStudents)
        renderStudents(allStudents)
    } catch (error) {
        console.error('Error fetching data:', error)
        document.getElementById('loadingState').innerHTML = `
        <i class="fas fa-exclamation-triangle text-danger"></i>
        <p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
        <p class="small">${error.message}</p>`
    }
}

/**
 * @param {"จ่ายแล้ว"|"โอนจ่าย"|"ใช้แล้ว"} status 
 * @returns {String} html element
 */
function getStatusBadge(status) {
    switch (status) {
        case "จ่ายแล้ว": return '<span class="status-badge status-paid"><i class="fas fa-check-circle me-1"></i>จ่ายแล้ว</span>'
        case "โอนจ่าย": return '<span class="status-badge status-transfer"><i class="fas fa-exchange-alt me-1"></i>โอนจ่าย</span>'
        case "ใช้แล้ว": return '<span class="status-badge status-used"><i class="fas fa-minus-circle me-1"></i>ใช้แล้ว</span>'
        default: return '<span class="status-badge status-unpaid"><i class="fas fa-times-circle me-1"></i>ยังไม่จ่าย</span>'
    }
}

/**
 * force to return 0 if NaN
 * @param {String|Number} num 
 * @returns {Number}
 */
const zeroBreak = (num) => {
    const int = Number(num)
    if (Number.isNaN(int)) return 0
    return int || 0
}

const escapeHTML = (() => {
    const span = document.createElement('span')
    return (text) => {
        span.textContent = text
        return span.innerHTML
    }
})()

function renderStudent(student) {
    const totalOwed = maxAmount - student.totalPaid
    const unpaidWeeks = student.payments.filter(p => !p.paid && !p.used)
    const unpaidCount = unpaidWeeks.length
    const unpaidAmount = unpaidWeeks.reduce((sum, p) => sum + p.status === "ใช้ไปแล้ว" ? 0 : zeroBreak(p.amountRaw || "0"), 0)

    let paymentsTable = ''
    if (student.payments.length > 0) {
        paymentsTable = `
        <div class="payment-table">
            <table>
                <thead>
                    <tr>
                        <th>เดือนที่</th>
                        <th>สัปดาห์</th>
                        <th>รายละเอียด</th>
                        <th class="text-end">จำนวน</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${student.payments.map(payment => `
                        <tr>
                            <td>${escapeHTML(payment.month)}</td>
                            <td>${escapeHTML(payment.week)}</td>
                            <td>${escapeHTML(payment.label)}</td>

                            <td class="text-end">${escapeHTML(payment.amountRaw)} บาท</td>
                            <td>${getStatusBadge(payment.status)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`
    }

    return `
    <div class="student-card">
        <div class="student-header">
            <div class="student-name">${escapeHTML("" + student.prefix + student.firstName + " " + student.lastName)}</div>
            <div class="student-number">เลขที่ ${escapeHTML(student.id)}</div>
        </div>

        <div class="payment-summary">
            <div class="summary-card">
                <div class="summary-label">จ่ายแล้ว</div>
                <div class="summary-value positive">฿${escapeHTML(student.totalPaid)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">คงค้าง</div>
                <div class="summary-value ${totalOwed > 0 ? 'negative' : 'positive'}">฿${escapeHTML(totalOwed)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">สัปดาห์ที่ยังไม่จ่าย</div>
                <div class="summary-value ${unpaidCount > 0 ? 'negative' : 'positive'}">${escapeHTML(unpaidCount)} สัปดาห์</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">จำนวนที่ต้องจ่าย</div>
                <div class="summary-value ${unpaidAmount > 0 ? 'negative' : 'positive'}">฿${escapeHTML(unpaidAmount)}</div>
            </div>
        </div>

        ${paymentsTable}
    </div>`
}

function renderStudents(students) {
    const container = document.getElementById('resultsContainer')
    if (students.length === 0) {
        container.innerHTML = `
        <div class="no-results">
            <i class="fas fa-search fa-3x mb-3"></i>
            <p>ไม่พบข้อมูล</p>
        </div>`
    } else container.innerHTML = students.map(renderStudent).join('')
}

function renderSummaryTable(students) {
    const container = document.getElementById('summaryTableContainer')
    if (!students.length) return container.innerHTML = ''

    const rows = students.map(s => {
        const totalOwed = maxAmount - s.totalPaid
        const unpaidWeeks = s.payments.filter(p => !p.paid && !p.used).length
        const unpaidAmount = s.payments.filter(p => !p.paid && !p.used).reduce((sum, p) => sum + p.status === "ใช้ไปแล้ว" ? 0 : zeroBreak(p.amountRaw || "0"), 0)
        return `
        <tr>
            <td>${escapeHTML(s.id)}</td>
            <td>${escapeHTML("" + s.prefix + s.firstName + " " + s.lastName)}</td>
            <td class="${s.totalPaid < 0 ? 'negative' : 'positive'}">฿${escapeHTML(s.totalPaid)}</td>
            <td class="${totalOwed > 0 ? 'negative' : 'positive'}">฿${escapeHTML(totalOwed)}</td>
            <td class="${unpaidWeeks > 0 ? 'negative' : 'positive'}">${escapeHTML(unpaidWeeks)} สัปดาห์</td>
            <td class="${unpaidAmount > 0 ? 'negative' : 'positive'}">฿${escapeHTML(unpaidAmount)}</td>
        </tr>`
    }).join('')

    container.innerHTML = `
    <div class="payment-table mb-3">
        <table>
            <thead>
            <tr>
                <th>ที่</th>
                <th>ชื่อจริง</th>
                <th>จ่ายแล้ว</th>
                <th>คงค้าง</th>
                <th>สัปดาห์ที่ยังไม่จ่าย</th>
                <th>จำนวนที่ต้องจ่าย</th>
            </tr>
            </thead>
            <tbody>
            ${rows}
            </tbody>
        </table>
    </div>`
}

function searchStudents(query) {
    query = query.toLowerCase().trim()
    const summaryTable = document.getElementById('summaryTableContainer')

    if (!query) {
        renderSummaryTable(allStudents)
        return renderStudents(allStudents)
    }

    summaryTable.innerHTML = ''

    const results = allStudents.filter(student => {
        const id = student.id.toString()
        const fullName = `${student.firstName} ${student.lastName}`.toLowerCase()
        const fullNameWithPrefix = `${student.prefix}${student.firstName} ${student.lastName}`.toLowerCase()

        if (!isNaN(query) && id === query) return true
        return id === query ||
            fullName.includes(query) ||
            fullNameWithPrefix.includes(query) ||
            student.firstName.toLowerCase().includes(query) ||
            student.lastName.toLowerCase().includes(query)
    })

    renderStudents(results)
}

document.addEventListener('DOMContentLoaded', () => {
    fetchData()
    document.getElementById('searchInput').addEventListener('input', (e) => searchStudents(e.target.value))
})