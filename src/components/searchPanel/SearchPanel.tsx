import React, {
    memo, useState, useMemo, useEffect,
} from 'react'
import debounce from 'lodash.debounce'
import ReactAutosuggest from 'react-autosuggest'
import { Button } from '@entur/component-library'
import { Coordinates } from '@entur/sdk'

import { Spinner, GeoLocation } from '../../assets/icons'
import service from '../../service'
import { useLocationPermission } from '../../hooks'
import './styles.scss'

const YOUR_POSITION = 'Posisjonen din'

function getSuggestionValue(suggestion) {
    return suggestion.name
}

function shouldRenderSuggestions() {
    return true
}

function renderSuggestion(suggestion) {
    if (suggestion.name !== YOUR_POSITION) {
        return <span>{suggestion.name}</span>
    }
    return (
        <span>
            {suggestion.name}
            <span className="location-icon">
                <GeoLocation size={15} />
            </span>
        </span>
    )
}

function getErrorMessage(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            return 'Du må godta bruk av posisjon i nettleseren før vi kan hente den.'
        default:
            return 'En feil skjedde ved henting av din posisjon'
    }
}


const renderSpinner = () => {
    return (
        <div className="spinner-container">
            <Spinner className="spinner" />
        </div>
    )
}

const getFeaturesDebounced = debounce(async (value, showMyPosition, callback) => {
    const inputLength = value.trim().length

    const defaultSuggestions = showMyPosition ? [{ name: YOUR_POSITION }] : []

    if (!inputLength) return callback(defaultSuggestions)

    const featuresData = await service.getFeatures(value)

    const suggestedFeatures = featuresData.map(
        ({ geometry, properties: { name, locality } }) => {
            return {
                coordinates: {
                    longitude: geometry.coordinates[0],
                    latitude: geometry.coordinates[1],
                },
                name: `${name}, ${locality}`,
            }
        },
    )

    const features = [...defaultSuggestions, ...suggestedFeatures]

    return callback(features)
}, 500)

const SearchPanel = ({ handleCoordinatesSelected }: Props): JSX.Element => {
    const [{ denied }, refreshLocationPermission] = useLocationPermission()

    const [showPositionInList, setShowPositionInList] = useState(true)

    useEffect(() => {
        if (denied) {
            setShowPositionInList(false)
        }
    }, [denied])

    const [formValue, setFormValue] = useState('')
    const [errorMessage, setErrorMessage] = useState(null)

    const [location, setLocation] = useState({
        hasLocation: false,
        selectedLocationName: null,
    })

    const [suggestions, setSuggestions] = useState([{ name: YOUR_POSITION }])
    const [waiting, setWaiting] = useState<boolean>(false)
    const [chosenCoord, setChosenCoord] = useState<Coordinates | null>(null)

    const onChange = (_, { newValue }) => {
        setFormValue(newValue)
    }

    const onSuggestionsFetchRequested = ({ value }) => {
        if (value !== location.selectedLocationName) {
            setLocation({
                hasLocation: false,
                selectedLocationName: null,
            })

            setChosenCoord(null)
        }
        getFeaturesDebounced(value, showPositionInList, setSuggestions)
    }

    const getAddressFromPosition = position => {
        setFormValue(YOUR_POSITION)
        setChosenCoord(position)
        setLocation({
            hasLocation: true,
            selectedLocationName: YOUR_POSITION,
        })
    }

    const onSuggestionsClearRequested = () => {
        const newSuggestions = showPositionInList ? [{ name: YOUR_POSITION }] : []
        setSuggestions(newSuggestions)
    }

    const handleSuccessLocation = data => {
        refreshLocationPermission()
        const position = { latitude: data.coords.latitude, longitude: data.coords.longitude }
        getAddressFromPosition(position)
        setWaiting(false)
    }

    const handleDeniedLocation = error => {
        refreshLocationPermission()
        setFormValue('')
        setErrorMessage(getErrorMessage(error))
        setSuggestions([])
        setLocation({
            hasLocation: false,
            selectedLocationName: null,
        })
        setWaiting(false)
    }

    const onSuggestionSelected = (_, { suggestion }) => {
        if (suggestion.name === YOUR_POSITION) {
            setWaiting(true)
            setLocation(v => ({
                ...v,
                selectedLocationName: YOUR_POSITION,
            }))

            navigator.geolocation.getCurrentPosition(handleSuccessLocation, handleDeniedLocation)
        } else {
            setChosenCoord(suggestion.coordinates)
            setLocation({
                hasLocation: true,
                selectedLocationName: suggestion.name,
            })
        }
    }

    const handleGoToBoard = event => {
        event.preventDefault()
        return chosenCoord ? handleCoordinatesSelected(chosenCoord) : null
    }

    const inputProps = useMemo(() => ({
        placeholder: 'Adresse eller sted',
        value: formValue,
        onChange,
        onFocus: () => {
            setErrorMessage(null)
        },
    }), [formValue])

    return (
        <form className="search-panel" onSubmit={handleGoToBoard}>
            <div className="search-container">
                <div className="input-container">
                    <span>Område</span>
                    <div className="input-spinner-container">
                        <ReactAutosuggest
                            suggestions={suggestions}
                            shouldRenderSuggestions={shouldRenderSuggestions}
                            onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                            onSuggestionsClearRequested={onSuggestionsClearRequested}
                            onSuggestionSelected={onSuggestionSelected}
                            getSuggestionValue={getSuggestionValue}
                            renderSuggestion={renderSuggestion}
                            inputProps={inputProps}
                        />
                        {waiting && renderSpinner()}
                    </div>
                </div>
                <Button
                    className="search-panel__submit-button"
                    type="submit"
                    disabled={!location.hasLocation}
                >
                    Opprett tavle
                </Button>
            </div>
            {errorMessage && (
                <p role="alert" style={{ color: 'red', textAlign: 'center' }}>
                    {errorMessage}
                </p>
            )}
        </form>
    )
}

interface Props {
    handleCoordinatesSelected: (choseCoord: Coordinates | null) => void,
}

export default memo(SearchPanel)
