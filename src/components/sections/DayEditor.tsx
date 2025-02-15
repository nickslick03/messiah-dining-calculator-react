import { useContext, useMemo, useState } from 'react';
import { WEEKDAYS } from '../../static/constants';
import DotLeader from '../other/DotLeader';
import {
  EndDateCtx,
  MealPlanCtx,
  StartDateCtx,
  TutorialElementsCtx,
  UserSelectedMealsCtx,
  WeeksOffCtx,
  MealsCtx
} from '../../static/context';
import Divider from '../other/Divider';
import MealContainer from '../containers/MealContainer';
import Meal, { isMeal } from '../../types/Meal';
import { CustomMealsCtx } from '../../static/context';
import { getWeekdaysBetween } from '../../lib/dateCalcuation';
import { getMealDayTotal } from '../../lib/calculationEngine';
import formatCurrency from '../../lib/formatCurrency';
import DaySelector from '../form_elements/DaySelector';
import {
  UserSelectedMealsObject,
  Weekday
} from '../../types/userSelectedMealsObject';
import mapUserMeals from '../../lib/mapUserMeals';
import dereferenceMeal from '../../lib/dereferenceMeal';
import tooltip from '../../static/tooltip';
import Button from '../form_elements/Button';
import ModalContainer from '../containers/ModalContainer';
import Notification from '../other/Notification';

interface DayEditorProps {
  /** The order this component should appear. */
  order: number;
}

/**
 * Renders a meal table for meals added to given days an an option to remove meals from that day.
 * Also includes a results summary.
 *
 * @param {DayEditorProps} props - The props for the component.
 * @return {JSX.Element} The rendered DayEditor component.
 */
const DayEditor = ({ order }: DayEditorProps) => {
  const userSelectedMeals = useContext(UserSelectedMealsCtx);
  const customMeals = useContext(CustomMealsCtx);
  const weeksOff = useContext(WeeksOffCtx);
  const tutorialRefs = useContext(TutorialElementsCtx);
  const startDate = useContext(StartDateCtx);
  const endDate = useContext(EndDateCtx);
  const discount = useContext(MealPlanCtx);
  const meals = useContext(MealsCtx);

  /**
   * Transforms the userSelectedMeals object into an array of [day, [meal, meal, meal, ...]]
   */
  const userSelectedMealsValue = useMemo(
    () =>
      mapUserMeals(
        (day: Weekday) =>
          [
            day,
            userSelectedMeals.value[day]
              .map((mr) => dereferenceMeal(mr, meals.value, customMeals.value))
              .filter((m) => m !== undefined)
          ] as [string, Meal[]]
      ),
    [userSelectedMeals, customMeals, meals]
  );

  /**
   * State variable to track which day the user is editing
   */
  const [weekdayIndex, setWeekdayIndex] = useState(0);

  /**
   * Whether the confirm message to clear all selected meals is visible.
   */
  const [confirmIsVisible, setConfirmIsVisible] = useState(false);

  const [message, setMessage] = useState({ text: '' });

  /**
   * Get the day of the week the user is editing
   */
  const weekday = useMemo(() => WEEKDAYS[weekdayIndex], [weekdayIndex]);

  /**
   * Get the list of selected meals for the given day
   */
  const dayMealList = useMemo(
    () => (userSelectedMealsValue[WEEKDAYS[weekdayIndex]] as Meal[]) ?? [],
    [userSelectedMealsValue, weekdayIndex]
  );

  /**
   * The total cost of the selected meals for the given day.
   */
  const mealDayTotal = useMemo(
    () => getMealDayTotal(dayMealList, 1, discount.value ?? false),
    [dayMealList, discount.value]
  );

  /**
   * The total number of days for each weekday (starting on Sunday)
   */
  const numOfWeekdays = useMemo(
    () =>
      startDate.value !== null && endDate.value !== null
        ? getWeekdaysBetween(
            startDate.value,
            endDate.value,
            weeksOff.value ?? 0
          )
        : Array(7).fill(0),
    [startDate, endDate, weeksOff]
  );

  /**
   * The total number of meals for each weekday (starting on Sunday).
   */
  const numOfMeals = useMemo(
    () => WEEKDAYS.map((day) => userSelectedMealsValue[day].length),
    [userSelectedMealsValue]
  );

  /**
   * Checks for days with undefined meals
   */
  const daysWithErrors = useMemo(
    () =>
      Object.values(userSelectedMealsValue).map((day) =>
        day.some((m) => !isMeal(m) || m?.legacy)
      ),
    [userSelectedMealsValue]
  );

  /**
   * Removes a meal from the currently selected day.
   * @param meal - The meal to be removed
   */
  const removeMeal = (meal: Meal) => {
    userSelectedMeals.setValue({
      ...userSelectedMeals.value,
      [WEEKDAYS[weekdayIndex]]: userSelectedMeals.value[
        WEEKDAYS[weekdayIndex]
      ].filter((m) => m.instanceId !== meal.instanceId)
    });
  };

  /**
   * Clears all meals from the specified day.
   * @param weekday - The specifiecd weekday.
   * */
  const clearDay = (weekday: string) => {
    userSelectedMeals.setValue({
      ...userSelectedMeals.value,
      [weekday]: []
    });
  };

  /**
   * Clears all the meals from the user selected meals object.
   */
  const clearAll = () => {
    userSelectedMeals.setValue(new UserSelectedMealsObject());
  };

  return (
    <>
      <MealContainer
        title='Day Editor'
        daySelector={
          <div className='w-full bg-gray-300 rounded-lg mt-4'>
            <DaySelector
              daysSelected={new Array(7)
                .fill(false)
                .map((_, day) => day === weekdayIndex)}
              daysWithErrors={daysWithErrors}
              onChange={setWeekdayIndex}
              numOfMeals={numOfMeals}
              slideHighlight
            />
          </div>
        }
        addOrRemove='Del'
        meals={dayMealList}
        buttonOnClick={removeMeal}
        createNotification={(name) => `Removed ${name} from ${weekday}`}
        searchable={false}
        tooltip={tooltip.dayEditor}
        setRef={(ref) => tutorialRefs.setValue(ref, 'Day Editor')}
        order={order}
      >
        <div className='flex gap-2 my-4'>
          <Button
            title={`Clear ${weekday} Meals`}
            onClick={() => {
              clearDay(weekday);
              setMessage({ text: `Cleared Selected Meals on ${weekday}` });
            }}
            disabled={userSelectedMealsValue[weekday].length === 0}
          />
          <Button
            title={`Clear All Meals`}
            onClick={() => setConfirmIsVisible(true)}
            disabled={Object.getOwnPropertyNames(userSelectedMealsValue).every(
              (weekday) => userSelectedMealsValue[weekday].length === 0
            )}
          />
        </div>
        <Divider />
        <DotLeader
          info={[
            {
              title: `Total for One ${weekday}`,
              value: `${
                isNaN(mealDayTotal) ? 'ERROR' : formatCurrency(mealDayTotal)
              }`,
              resultsStyle: 'text-messiah-red'
            },
            {
              title: `Number of ${weekday}(s)`,
              value: `${numOfWeekdays[weekdayIndex]}`
            },
            {
              title: `Total of All ${weekday}s`,
              value: `${
                isNaN(mealDayTotal)
                  ? 'ERROR'
                  : formatCurrency(
                      mealDayTotal * numOfWeekdays[weekdayIndex] // Convert from Monday to Sunday start
                    )
              }`,
              resultsStyle: 'text-messiah-red'
            }
          ]}
        />
      </MealContainer>
      <Notification message={message} />
      {confirmIsVisible ? (
        <ModalContainer
          title={'Clear All Selected Meals'}
          onCancel={() => setConfirmIsVisible(false)}
          onConfirm={() => {
            setConfirmIsVisible(false);
            clearAll();
            setMessage({ text: 'Cleared All Selected Meals' });
          }}
          minimalSpace={true}
          confirmDisabled={false}
          zIndex={60}
        >
          Are you sure you want to clear all selected meals?
        </ModalContainer>
      ) : (
        ''
      )}
    </>
  );
};

export default DayEditor;
