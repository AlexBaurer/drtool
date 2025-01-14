document.addEventListener('DOMContentLoaded', async function () {
    const cardList = document.getElementById('cardList');
    const filterForm = document.getElementById('filterForm');
    const searchInput = document.getElementById('searchInput');
    const editableCardTitle = document.getElementById('editableCardTitle');
    const editableCardContent = document.getElementById('editableCardContent');
    const saveCardButton = document.getElementById('saveCardButton');
    const viewLogButton = document.getElementById('viewLogButton');
    const backLogButton = document.getElementById("backLogButton");
    const cardMetadata = document.getElementById('cardMetadata');
    const dateReviewField = document.getElementById('dateReview');
    const saveNewCardButton = document.getElementById('saveNewCard');
    const newCardTitleInput = document.getElementById('newCardTitle');
    const newCardContentInput = document.getElementById('newCardContent');
    const newCardReviewDate = document.getElementById("newCardReviewDate");
    const editReviewDate = document.getElementById('editReviewDate');
    const saveReviewDate = document.getElementById('saveReviewDate');
    const rightPanel = document.getElementById("rightPanel");
    const logWindow = document.getElementById("logWindow");
    const logContent = document.getElementById("logContent");
    const sortByDate = document.getElementById("sortByDate");
    const sortByAuthor = document.getElementById("sortByAuthor");
    const sortByAlphabet = document.getElementById("sortByAlphabet");
    const sortByOverdue = document.getElementById("sortByOverdue");

    let currentCard = null;

    const showLog = async () => {
        logWindow.classList.add("show");

        try {
            // Запрос данных с бэкенда
            const response = await fetch(`/api/logs?card_id=${currentCard.id}`);
            if (!response.ok) throw new Error(`Ошибка: ${response.statusText}`);

            const data = response.json();

            renderLog(data);
        } catch (error) {
            logContent.innerHTML = `<p class="text-danger">Не удалось загрузить данные: ${error.message}</p>`;
        }
    };

    const renderLog = async (data) => {
        logContent.innerHTML = ''; // Очищаем содержимое перед рендерингом новых данных

        logs = await data
        console.log('renderlogIn:', logs);

        if (logs && logs.length > 0) {
            logs.forEach(log => {
                console.log('InLoop:', log);
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry border-bottom p-2 mb-2';

                const action = log.log_content.action;
                const data = log.log_content;

                let logDetails = `
                    <h4>Действие: ${action}</h4>
                    <p><strong>Дата:</strong> ${new Date(data.updated_at || data.created_at).toLocaleString()}</p>
                    <p><strong>Название:</strong> ${data.title || 'N/A'}</p>
                    <p><strong>Содержание:</strong> ${data.content || 'N/A'}</p>
                    <p><strong>Дата проверки:</strong> ${data.date_review || 'N/A'}</p>
                `;

                logEntry.innerHTML = logDetails;
                logContent.appendChild(logEntry);
            });
        } else {
            logContent.innerHTML = '<p class="text-muted">Нет доступных логов для этой карточки.</p>';
        }
    };

    // Функция для возврата к панели
    const goBackLog = () => {
        logWindow.classList.remove("show");
    };

    async function fetchCards() {
        const response = await fetch('/api/cards');
        if (!response.ok) {
            alert('Failed to fetch cards.');
            return [];
        }
        return await response.json();
    }

    async function saveCard(card) {
        console.log('API responseSC:', await fetch('/api/cards').then(res => res.json()));
        const response = await fetch(`/api/cards/${card.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(card)
        });

        if (!response.ok) {
            alert('Failed to save card.');
        }
    }

    async function createNewCard(title, content, dateReview) {
        console.log('API responseCNC:', await fetch('/api/cards').then(res => res.json()));
        const response = await fetch('/api/cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content,
                date_review: dateReview
            })
        });

        if (!response.ok) {
            alert('Failed to create a new card.');
            const error = await response.json();
            console.error('Server error:', error);
        }
    }

    function dateCutter(dateToConv){
        const convDateObj = new Date(dateToConv);

        const year = convDateObj.getFullYear();
        const month = String(convDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(convDateObj.getDate()).padStart(2, '0');

        const convDateRes = `${year}-${month}-${day}`;
        return convDateRes;
    }

    async function renderCards(filter = '', inputCards) {
        const cards = inputCards || await fetchCards();

        console.log('API responseRC:', await fetch('/api/cards').then(res => res.json()));

        console.log('cards:', cards);

        cardList.innerHTML = '';
        cards
            .filter(card => card.title.toLowerCase().includes(filter.toLowerCase()))
            .forEach(card => {
                const cardElement = document.createElement('div');
                const formattedDateCreatedAt = dateCutter(card.created_at);
                const formattedDateReview = dateCutter(card.date_review);
                cardElement.className = `p-3 rounded-4 border card-item d-flex justify-content-between align-items-center
                 ${new Date(card.date_review) < new Date() ? 'review-date-warning' : ''}`;
                cardElement.dataset.cardId = card.id;

                cardElement.innerHTML = `
                <div>${card.title}</div>
                <div class="text-muted">
                    <small>Created: ${formattedDateCreatedAt}</small><br>
                    <small>Review: ${formattedDateReview || 'N/A'}</small>
                </div>
                `;

                cardList.appendChild(cardElement);

                cardElement.addEventListener('click', () => selectCard(card));
            });
    }

    function selectCard(card) {
        const formattedDateCreatedAt = dateCutter(card.created_at);
        const formattedDateUpdatedAt = dateCutter(card.updated_at);
        currentCard = card;
        editableCardTitle.value = card.title;
        editableCardContent.value = card.content;
        dateReviewField.textContent = `${dateCutter(card.date_review)}`;
        editableCardTitle.disabled = false;
        editableCardContent.disabled = false;
        saveCardButton.disabled = false;
        cardMetadata.textContent = `Created: ${formattedDateCreatedAt} | Last Updated: ${formattedDateUpdatedAt} | Author: ${card.author}`;
    }

    saveCardButton.addEventListener('click', async function () {
        if (currentCard) {
            currentCard.title = editableCardTitle.value;
            currentCard.content = editableCardContent.value;
            currentCard.date_review = dateReviewField.textContent;

            await saveCard(currentCard);
            renderCards(searchInput.value);
        }
    });

    saveNewCardButton.addEventListener('click', async function () {
        const title = newCardTitleInput.value;
        const content = newCardContentInput.value;
        const dateReview = newCardReviewDate.value; // Default review date: today

        if (title && content) {
            await createNewCard(title, content, dateReview);
            renderCards(searchInput.value);
        }
    });

    searchInput.addEventListener('input', function () {
        renderCards(searchInput.value);
    });

    saveReviewDate.addEventListener('click', async function(){
        if (!currentCard) {
            alert('No card selected to edit.');
            return;
        }

        const reviewDateInput = document.getElementById('reviewDateInput');
        const newReviewDate = reviewDateInput.value;

        if (!newReviewDate) {
            alert('Please enter a review date.');
            return;
        }
        console.log('New review date:', newReviewDate);

        currentCard.date_review = newReviewDate;
        console.log('review date:', currentCard.date_review);
        await saveCard(currentCard);
        renderCards(searchInput.value);
        document.getElementById('dateReview').textContent = `${currentCard.date_review}`;
        alert('Review date updated successfully!');
    });


    filterForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(filterForm);
        const params = new URLSearchParams(formData);

        const url = `/api/cards?${params.toString()}`;
        console.log('url', url);
        window.history.pushState(null, '', url);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch filtered cards');
            }

            const cards = await response.json();

            cardList.innerHTML = '';
            cards
                .filter(card => card.title.toLowerCase())
                .forEach(card => {
                    const cardElement = document.createElement('div');
                    const formattedDateCreatedAt = dateCutter(card.created_at);
                    const formattedDateReview = dateCutter(card.date_review);
                    cardElement.className = `p-3 rounded-4 border card-item d-flex justify-content-between align-items-center
                     ${new Date(card.date_review) < new Date() ? 'review-date-warning' : ''}`;
                    cardElement.dataset.cardId = card.id;

                    cardElement.innerHTML = `
                    <div>${card.title}</div>
                    <div class="text-muted">
                        <small>Created: ${formattedDateCreatedAt}</small><br>
                        <small>Review: ${formattedDateReview || 'N/A'}</small>
                    </div>
                    `;

                    cardList.appendChild(cardElement);

                    cardElement.addEventListener('click', () => selectCard(card));
                });
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to apply filters');
        }
    });

    filterForm.addEventListener('reset', () => {
        window.history.pushState(null, '', '/');
        renderCards();
    });

    viewLogButton.addEventListener("click", showLog);

    backLogButton.addEventListener("click", goBackLog);

    // Фильтрация карточек по просроченным
    sortByOverdue.addEventListener('click', async function() {
        const cards = await fetchCards();
        cards.sort((a, b) => {
            const aIsOverdue = a.reviewDate < currentDate;
            const bIsOverdue = b.reviewDate < currentDate;
            return (aIsOverdue === bIsOverdue) ? 0 : aIsOverdue ? -1 : 1;
        });
        renderCards(searchInput.value, cards);
    });

    // Фильтрация карточек по дате
    sortByDate.addEventListener('click', async function() {
        const cards = await fetchCards();
        cards.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        renderCards(searchInput.value, cards);
    });

    // Фильтрация карточек по автору
    sortByAuthor.addEventListener('click', async function() {
        const cards = await fetchCards();
        cards.sort((a, b) => a.author.localeCompare(b.author));
        renderCards(searchInput.value, cards);
    });

    // Фильтрация карточек по алфавиту
    sortByAlphabet.addEventListener('click', async function() {
        const cards = await fetchCards();
        cards.sort((a, b) => a.title.localeCompare(b.title));
        renderCards(searchInput.value, cards);
    });

    // Инициализация отображения карточек
    renderCards();

});
