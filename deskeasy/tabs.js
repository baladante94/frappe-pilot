document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
            btn.classList.add('active');
            document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).style.display = 'block';
        });
    });
});
