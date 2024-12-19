document.addEventListener('DOMContentLoaded', async function () {
    const cardList = document.getElementById('cardList');
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
    const rightPanel = document.getElementById("rightPanel");
    const modalWindow = document.getElementById("modalWindow");

    // Функция для показа модального окна
    const showModal = () => {
        modalWindow.classList.add("show");
    };

    // Функция для возврата к панели
    const goBack = () => {
        modalWindow.classList.remove("show");
    };

    let currentCard = null;

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

    async function renderCards(filter = '') {
        const cards = await fetchCards();
        console.log('API responseRC:', await fetch('/api/cards').then(res => res.json()));

        cardList.innerHTML = '';
        cards
            .filter(card => card.title.toLowerCase().includes(filter.toLowerCase()))
            .forEach(card => {
                const cardElement = document.createElement('div');
                const formattedDateObj = new Date(card.created_at);
                const formattedDate = formattedDateObj.toISOString().split("T")[0];
//                cardElement.textContent = `${card.title} (Created: ${card.created_at}, Review: ${card.date_review})`;
                cardElement.className = `p-3 rounded-4 border card-item d-flex justify-content-between align-items-center
                 ${new Date(card.date_review) < new Date() ? 'review-date-warning' : ''}`;
                cardElement.dataset.cardId = card.id;

                cardElement.innerHTML = `
                <div>${card.title}</div>
                <div class="text-muted">
                    <small>Created: ${formattedDate}</small><br>
                    <small>Review: ${card.date_review || 'N/A'}</small>
                </div>
                `;

                cardList.appendChild(cardElement);

//                if (new Date(card.date_review) < new Date()) {
//                    cardElement.classList.add('overdue');
//                }

                cardElement.addEventListener('click', () => selectCard(card));
            });
    }

    function selectCard(card) {
        currentCard = card;
        editableCardTitle.value = card.title;
        editableCardContent.value = card.content;
        dateReviewField.textContent = card.date_review;
        editableCardTitle.disabled = false;
        editableCardContent.disabled = false;
        saveCardButton.disabled = false;
        cardMetadata.textContent = `Created: ${card.created_at} | Last Updated: ${card.updated_at} | Author: ${card.author}`;
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

    editReviewDate.addEventListener('click', async function () {
        if (!currentCard) {
            alert('No card selected to edit.');
            return;
        }

        const newReviewDate = prompt('Enter a new review date (YYYY-MM-DD):', currentCard.reviewDate);
        if (newReviewDate) {
            // Проверяем формат даты
            const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(newReviewDate);
            if (!isValidDate) {
                alert('Invalid date format. Please use YYYY-MM-DD.');
                return;
            }

            const oldReviewDate = currentCard.reviewDate;
            currentCard.reviewDate = newReviewDate;

//            if (!currentCard.logs) {
//                currentCard.logs = [];
//            }
//
//            // Добавляем запись в лог о смене даты пересмотра
//            currentCard.logs.push({
//                timestamp: new Date().toISOString(),
//                action: 'Review Date Updated',
//                oldReviewDate: oldReviewDate,
//                newReviewDate: currentCard.reviewDate
//            });

            // Обновляем отображение
            document.getElementById('dateReview').textContent = `${currentCard.reviewDate}`;
            currentCard.date_review = dateReviewField.textContent;
            await saveCard(currentCard);
            renderCards(searchInput.value);
            alert('Review date updated successfully!');
        }

    });



    viewLogButton.addEventListener("click", showModal);

    backLogButton.addEventListener("click", goBack);

//    // Фильтрация карточек по просроченным
//    document.getElementById('filterOverdue').addEventListener('click', function() {
//        cards.sort((a, b) => {
//            const aIsOverdue = a.reviewDate < currentDate;
//            const bIsOverdue = b.reviewDate < currentDate;
//            return (aIsOverdue === bIsOverdue) ? 0 : aIsOverdue ? -1 : 1;
//        });
//        renderCards(searchInput.value);
//    });
//
//    // Фильтрация карточек по дате
//    document.getElementById('filterDate').addEventListener('click', function() {
//        cards.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
//        renderCards(searchInput.value);
//    });
//
//    // Фильтрация карточек по автору
//    document.getElementById('filterAuthor').addEventListener('click', function() {
//        cards.sort((a, b) => a.author.localeCompare(b.author));
//        renderCards(searchInput.value);
//    });
//
//    // Фильтрация карточек по алфавиту
//    document.getElementById('filterAlphabet').addEventListener('click', function() {
//        cards.sort((a, b) => a.title.localeCompare(b.title));
//        renderCards(searchInput.value);
//    });

    // Инициализация отображения карточек
    renderCards();

});
