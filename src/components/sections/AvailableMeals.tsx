import Meal from '../../types/Meal';
import MealContainer from '../containers/MealContainer';
import CustomMeal from '../other/CustomMeal';
import {
  CustomMealsCtx,
  MealQueueCtx,
  TutorialElementsCtx,
  UserSelectedMealsCtx,
  MealsCtx
} from '../../static/context';
import { useContext, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import tooltip from '../../static/tooltip';
import CustomMealAddModal from '../modals/CustomMealAddModal';
import {
  UserSelectedMealsObjectType,
  Weekday
} from '../../types/userSelectedMealsObject';
import mapUserMeals from '../../lib/mapUserMeals';
import ModalContainer from '../containers/ModalContainer';
import Notification from '../other/Notification';

interface AvailableMealsProps {
  /** The order this component should appear. */
  order: number;
}

/**
 * Renders the Available Meals section with a table of meals to add and a button
 * to add a custom meal. Displays the add custommeal modal when the button is clicked.
 *
 * @return {JSX.Element} The Available Meals section component.
 */
const AvailableMeals = ({ order }: AvailableMealsProps) => {
  const meals = useContext(MealsCtx);
  const mealQueue = useContext(MealQueueCtx);
  const customMeals = useContext(CustomMealsCtx);
  const userSelectedMeals = useContext(UserSelectedMealsCtx);
  const tutorialRefs = useContext(TutorialElementsCtx);

  /**
   * State variable to determine whether or not the custom meal modal should be open.
   */
  const [isEditingCustomMeal, setIsEditingCustomMeal] = useState(false);

  /**
   * Shows confirm modal to delete selected custom meal.
   */
  const [isDeletingCustomMeal, setIsDeletingCustomMeal] = useState(false);

  /**
   * State variable to track the current custom meal editing data.
   */
  const [currentCustomData, setCurrentCustomData] = useState<Meal>();

  /**
   * State variable to track the ID of the next custom meal.
   */
  const [newCustomMealID, setNewCustomMealID] = useState<string>();

  /**
   * state for notification message
   */
  const [message, setMessage] = useState({ text: '' });

  /**
   * Updates a custom meal in the customMeals context with the provided location, name, and price.
   *
   * @param {string} location - The new location for the custom meal.
   * @param {string} name - The new name for the custom meal.
   * @param {number} price - The new price for the custom meal.
   * @return {void} This function does not return anything.
   */
  const onUpdateCustomMeal = (
    location: string,
    name: string,
    price: number
  ) => {
    customMeals.setValue(
      customMeals.value.map((val) =>
        val.id === currentCustomData?.id
          ? { ...val, location, name, price }
          : val
      )
    );
    setIsEditingCustomMeal(false);
  };

  /**
   * Opens the modal for editing a custom meal.
   */
  useEffect(() => {
    if (!currentCustomData) return;
    setIsEditingCustomMeal(true);
  }, [currentCustomData]);

  /**
   * Deletes a custom meal from the customMeals context.
   * Also removes the custom meal from the meal queue and any days it has been added to.
   */
  const deleteCustomMeal = () => {
    const customMealName = currentCustomData?.name;
    customMeals.setValue(
      customMeals.value.filter((val) => val.id !== currentCustomData?.id)
    );
    mealQueue.setValue(
      mealQueue.value.filter((val) => val.id !== currentCustomData?.id)
    );
    userSelectedMeals.setValue(
      mapUserMeals((day) => [
        day,
        userSelectedMeals.value[day].filter(
          (m) => m.id !== currentCustomData?.id
        )
      ]) as UserSelectedMealsObjectType
    );
    setIsDeletingCustomMeal(false);
    setIsEditingCustomMeal(false);
    setMessage({ text: `Deleted Custom Meal ${customMealName ?? ''}` });
  };

  /**
   * Adds a meal to the queue.
   *
   * @param {Meal} meal - The meal to be added to the queue.
   */
  const addToQueue = (meal: Meal) => {
    mealQueue.setValue([
      ...mealQueue.value,
      { instanceId: uuid(), id: meal.id ?? '' }
    ]);
  };

  /**
   * Adds a meal directly to the selected day.
   *
   * @param {Weekday} day - The day to add the meal to.
   * @param {Meal} meal - The meal to be added to the day.
   */
  const addToDay = (day: Weekday, meal: Meal) => {
    userSelectedMeals.setValue({
      ...userSelectedMeals.value,
      [day]: [
        ...(userSelectedMeals.value[day] ?? []),
        { ...meal, instanceId: uuid() }
      ]
    });
  };

  return (
    <>
      <MealContainer
        title='Available Meals'
        addOrRemove='Add'
        meals={[
          ...meals.value.filter((meal) => !meal?.legacy),
          ...customMeals.value
        ]}
        buttonOnClick={addToQueue}
        buttonOnClickDay={addToDay}
        createNotification={(name) => `Added ${name} to meal queue`}
        createDayNotification={(day, name) =>
          `Added ${name} directly to ${day}`
        }
        onCustomClick={(data: Meal) => {
          // If the custom data isn't changed, useEffect won't be triggered, but we don't have any new state
          // so all we need to do is show the modal
          if (currentCustomData === data) setIsEditingCustomMeal(true);
          else setCurrentCustomData(data);
        }}
        newCustomMealID={newCustomMealID}
        searchable
        tooltip={tooltip.availableMeals}
        setRef={(ref) => tutorialRefs.setValue(ref, 'Available Meals')}
        order={order}
      >
        <CustomMeal setNewCustomMealID={setNewCustomMealID} />
      </MealContainer>
      {
        // This cannot work with only the 'visible' property because otherwise it will not re-render
        // when we change its data
        isEditingCustomMeal ? (
          <CustomMealAddModal
            startingData={currentCustomData}
            onConfirm={onUpdateCustomMeal}
            onCancel={() => {
              setIsEditingCustomMeal(false);
            }}
            onDelete={() => setIsDeletingCustomMeal(true)}
            visible={isEditingCustomMeal}
          />
        ) : (
          <></>
        )
      }
      {isDeletingCustomMeal ? (
        <ModalContainer
          title={`Delete ${currentCustomData?.name}`}
          confirmText='Delete'
          confirmDisabled={false}
          minimalSpace={true}
          onConfirm={deleteCustomMeal}
          onCancel={() => setIsDeletingCustomMeal(false)}
          zIndex={60}
        >
          <p>
            This custom meal will be deleted from your available meals,
            <br />
            your meal queue, and any days you've added it to.
            <br />
            You can't undo this action. Delete this meal?
          </p>
        </ModalContainer>
      ) : (
        ''
      )}
      <Notification message={message} />
    </>
  );
};

export default AvailableMeals;
